// /pages/credit-card.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

// グローバル変数として定義
var zeusTokenIpcode = "2019002175";

export default function CreditCard() {
  const router = useRouter();
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [amount, setAmount] = useState(1000);
  const [isLoading, setIsLoading] = useState(false);

  // スクリプトの読み込みとzeusTokenIpcodeの設定
  useEffect(() => {
    // zeusTokenIpcodeをグローバルに設定
    window.zeusTokenIpcode = "2019002175";  // ゼウス発行のIPコードを設定

    const script = document.createElement('script');
    script.src = 'https://linkpt.cardservice.co.jp/api/token/2.0/zeus_token2.js';
    script.type = 'text/javascript';
    document.body.appendChild(script);

    // グローバル関数の定義
    window._onPaResSuccess = (data) => {
      console.log('認証成功:', data);
      if (data.status === 'success') {
        router.push('/payment-result?status=success');
      } else {
        router.push('/payment-result?status=failure');
      }
    };

    window._onError = (error) => {
      console.error('3Dセキュアエラー:', error);
      setIsLoading(false);
      alert('認証処理中にエラーが発生しました。');
    };

    window.loadedChallenge = () => {
      const waitDiv = document.getElementById('challenge_wait');
      if (waitDiv) {
        waitDiv.style.display = 'none';
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
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

      const data = await response.json();
      if (data.xid && data.iframeUrl) {
        // setPareqParamsを非同期で実行し、プロミスを適切に処理
        try {
          await new Promise((resolve, reject) => {
            window.setPareqParams(
              data.xid,           // md
              'PaReq',           // paReq (固定値)
              `${window.location.origin}/payment-result`, // termUrl
              '2',               // threeDSMethod (固定値)
              data.iframeUrl,    // iframeUrl
              resolve,           // 成功時のコールバック
              reject            // エラー時のコールバック
            );
          });
        } catch (error) {
          console.error('3Dセキュア認証エラー:', error);
          setIsLoading(false);
          alert('3Dセキュア認証処理中にエラーが発生しました。');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
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

        {/* 3Dセキュア用のコンテナ */}
        <div id="3dscontainer"></div>

        {/* チャレンジフロー待機メッセージ */}
        <div id="challenge_wait" style={{ display: isLoading ? 'block' : 'none' }}>
          <p>認証処理中です。しばらくお待ちください...</p>
        </div>
      </div>
    </>
  );
}
