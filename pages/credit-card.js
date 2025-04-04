// /pages/credit-card.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function CreditCard() {
  const router = useRouter();
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [amount, setAmount] = useState(1000);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Zeus発行のIPコードをグローバル変数に設定
    window.zeusTokenIpcode = '2019002175';

    // 3Dセキュア(token)用のスクリプトを読み込む
    const script = document.createElement('script');
    script.src = 'https://linkpt.cardservice.co.jp/api/token/2.0/zeus_token2.js';
    script.type = 'text/javascript';
    
    // スクリプトのロード完了を検知
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    
    script.onerror = () => {
      console.error('Zeus決済スクリプトのロードに失敗しました');
      alert('決済システムの読み込みに失敗しました。ページをリロードしてください。');
    };

    document.body.appendChild(script);

    // グローバル関数の定義（Zeus JSによって呼び出される）
    window._onPaResSuccess = (data) => {
      // ここに callback 結果が返ってくる
      console.log('=== _onPaResSuccess() 3Dセキュア認証結果 ===');
      console.log('レスポンス(認証結果):', data);

      // status が success / failure / invalid / maintenance などありうる
      if (data.status === 'success') {
        // 認証→決済が正常完了
        router.push('/payment-result?status=success');
      } else {
        // 認証失敗 or 何らかのエラー
        router.push('/payment-result?status=failure');
      }
    };

    window._onError = (error) => {
      console.error('=== _onError() 3Dセキュアエラー ===');
      console.error('エラー内容:', error);
      setIsLoading(false);
      alert('認証処理中にエラーが発生しました。');
    };

    // チャレンジ画面がロードされた際に呼ばれる
    window.loadedChallenge = () => {
      const waitDiv = document.getElementById('challenge_wait');
      if (waitDiv) {
        waitDiv.style.display = 'none';
      }
    };

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isScriptLoaded) {
      alert('決済システムの読み込みが完了していません。しばらくお待ちください。');
      return;
    }

    setIsLoading(true);

    try {
      console.log('=== [Step1] トークン発行 + EnrolReq 開始 ===');
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardNumber,
          expiryYear,
          expiryMonth,
          cardHolder,
          amount,
        }),
      });

      console.log('フロント→/api/payment へのレスポンス:', response);
      const data = await response.json();
      console.log('/api/payment の処理結果:', data);

      // EnrolReq の結果、 xID と iframeUrl が返ってきたら 3Dセキュア開始
      if (data.xid && data.iframeUrl) {
        try {
          console.log('=== [Step2] setPareqParams() による3Dセキュア認証開始 ===');
          
          // window.setPareqParamsが存在することを確認
          if (typeof window.setPareqParams !== 'function') {
            throw new Error('決済システムが正しく初期化されていません');
          }

          await new Promise((resolve, reject) => {
            window.setPareqParams(
              data.xid,
              'PaReq',
              `${window.location.origin}/payment-result/callback`,
              '2',
              data.iframeUrl,
              resolve,
              reject
            );
          });
        } catch (error) {
          console.error('setPareqParams 内部でエラー:', error);
          setIsLoading(false);
          alert('3Dセキュア認証処理中にエラーが発生しました。ページをリロードして再度お試しください。');
        }
      } else {
        console.error('EnrolReq の結果に不備があり、3Dセキュアを開始できません');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('フロント→/api/payment 呼び出しエラー:', error);
      alert('決済処理中にエラーが発生しました。');
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>クレジットカード決済</title>
      </Head>

      <div style={{ maxWidth: '400px', margin: '0 auto', padding: '1rem' }}>
        <h2>クレジットカード情報入力</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label>カード番号</label><br />
            <input
              type="text"
              maxLength={16}
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>有効期限</label><br />
            <select
              value={expiryMonth}
              onChange={(e) => setExpiryMonth(e.target.value)}
              style={{ marginRight: '0.5rem' }}
            >
              <option value="">月</option>
              {[...Array(12)].map((_, i) => {
                const m = i + 1;
                return <option key={m} value={m}>{m}</option>;
              })}
            </select>
            <select
              value={expiryYear}
              onChange={(e) => setExpiryYear(e.target.value)}
            >
              <option value="">年</option>
              {[...Array(10)].map((_, i) => {
                const year = new Date().getFullYear() + i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>カード名義</label><br />
            <input
              type="text"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>決済金額</label><br />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <button
            type="submit"
            style={{ padding: '0.5rem 1rem' }}
            disabled={isLoading}
          >
            {isLoading ? '処理中...' : '決済'}
          </button>
        </form>

        {/* 3Dセキュア用のiframeを表示するブロック */}
        <div id="3dscontainer"></div>

        {/* チャレンジフロー待機メッセージ */}
        <div id="challenge_wait" style={{ display: isLoading ? 'block' : 'none' }}>
          <p>認証処理中です。しばらくお待ちください...</p>
        </div>
      </div>
    </>
  );
}
