// /pages/credit-card.js
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function CreditCard() {
  const router = useRouter();
  const [cardNumber, setCardNumber] = useState('4111111111111111'); // テスト用カード番号
  const [expiryMonth, setExpiryMonth] = useState('12');
  const [expiryYear, setExpiryYear] = useState('2025');
  const [cardHolder, setCardHolder] = useState('TARO YAMADA');
  const [amount, setAmount] = useState(1000);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Zeus発行のIPコードをグローバル変数に設定
    window.zeusTokenIpcode = '2019002175';

    console.log('Zeus JSスクリプトを読み込み中...');
    // スクリプトの読み込み - 仕様書に基づいた正しいJSファイル
    const script = document.createElement('script');
    script.src = 'https://linkpt.cardservice.co.jp/api/token/2.0/zeus_token2.js';
    script.type = 'text/javascript';
    script.async = true;
    
    script.onload = () => {
      console.log('Zeus JSスクリプト読み込み完了');
      setIsScriptLoaded(true);
    };
    
    script.onerror = (error) => {
      console.error('Zeus JSスクリプト読み込みエラー:', error);
      alert('決済システムの読み込みに失敗しました。ページをリロードしてください。');
    };
    
    document.body.appendChild(script);

    // 仕様書で指定されたグローバル関数の実装
    // 1. PaRes受信後の画面制御操作メソッド
    window._onPaResSuccess = function(data) {
      console.log('_onPaResSuccess呼び出し:', data);
      
      // 3Dセキュアコンテナを非表示
      const container = document.getElementById('3dscontainer');
      if (container) {
        container.style.display = 'none';
      }
      
      // 認証完了後の処理
      const lastXidElement = document.getElementById('last-xid-value');
      if (lastXidElement) {
        const md = lastXidElement.value;
        const paRes = data && data.PaRes ? data.PaRes : 'Y';
        
        // 認証結果を決済処理APIに送信
        completePayment(md, paRes);
      } else {
        console.error('取引IDが見つかりません');
        setIsLoading(false);
      }
    };
    
    // 2. エラー時の処理メソッド
    window._onError = function(error) {
      console.error('3Dセキュア認証エラー:', error);
      alert('認証処理中にエラーが発生しました: ' + (error.message || JSON.stringify(error)));
      setIsLoading(false);
    };
    
    // postMessageイベントリスナー
    const handleMessage = (event) => {
      console.log('postMessageイベント受信:', event.origin, event.data);
      
      // AuthResultReadyイベント処理
      if (event.data && event.data.event === 'AuthResultReady') {
        console.log('Zeus認証結果イベント:', event.data);
      }
    };
    
    window.addEventListener('message', handleMessage);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      window.removeEventListener('message', handleMessage);
    };
  }, [router]);

  // 認証後の決済完了処理
  const completePayment = async (md, paRes) => {
    try {
      console.log('決済完了処理開始:', { md, paRes });
      
      const response = await fetch('/api/payment-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          MD: md,
          PaRes: paRes,
          status: 'success'
        }),
      });
      
      const result = await response.json();
      console.log('決済完了APIレスポンス:', result);
      
      // 結果ページへ遷移
      router.push({
        pathname: '/payment-result',
        query: { result: JSON.stringify(result) }
      });
    } catch (error) {
      console.error('決済完了処理エラー:', error);
      setIsLoading(false);
      alert('決済処理中にエラーが発生しました: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // カード情報とAPIを呼び出す
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
          amount
        }),
      });
      
      const result = await response.json();
      console.log('APIレスポンス:', result);
      
      if (result.iframeUrl && result.xid) {
        // 待機メッセージを非表示
        const waitElement = document.getElementById('challenge_wait');
        if (waitElement) {
          waitElement.style.display = 'none';
        }
        
        // XIDを保存（認証後の処理で使用）
        const hiddenField = document.createElement('input');
        hiddenField.type = 'hidden';
        hiddenField.id = 'last-xid-value';
        hiddenField.value = result.xid;
        document.body.appendChild(hiddenField);
        
        // 3Dセキュアコンテナにiframeを表示
        const container = document.getElementById('3dscontainer');
        if (container) {
          // iframeのURLをデコード
          const decodedUrl = result.iframeUrl.includes('%') 
            ? decodeURIComponent(result.iframeUrl) 
            : result.iframeUrl;
          
          console.log('デコード後のiframeURL:', decodedUrl);
          
          // コンテナを表示
          container.style.display = 'block';
          
          // 重要: 仕様書に従ってsetPareqParams関数を呼び出す
          if (typeof window.setPareqParams === 'function') {
            // TermURLはコールバックAPI
            const termUrl = `${window.location.origin}/api/payment-result/callback`;
            
            console.log('setPareqParams呼び出し:', {
              md: result.xid,
              paReq: '',
              termUrl,
              threeDSMethod: '',
              iframeUrl: decodedUrl
            });
            
            // 仕様書に従った引数で関数を呼び出し
            window.setPareqParams(result.xid, '', termUrl, '', decodedUrl, {
              container: '3dscontainer'  // 重要: コンテナIDを指定
            });
          } else {
            console.error('setPareqParams関数が見つかりません');
            
            // フォールバック: 直接iframeを挿入
            container.innerHTML = `<iframe 
              src="${decodedUrl}" 
              width="100%" 
              height="450px" 
              frameborder="0"
              allow="camera"
            ></iframe>`;
          }
        }
      } else {
        throw new Error('3Dセキュア認証に必要なデータの取得に失敗しました');
      }
    } catch (error) {
      console.error('決済処理エラー:', error);
      alert(`エラーが発生しました: ${error.message}`);
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
            style={{ padding: '0.5rem 1rem', width: '100%', backgroundColor: '#4CAF50', color: 'white', border: 'none' }}
            disabled={isLoading}
          >
            {isLoading ? '処理中...' : '決済する'}
          </button>
        </form>

        {/* チャレンジフロー待機メッセージ - 仕様書通りのID設定 */}
        <div id="challenge_wait" style={{ 
          display: isLoading ? 'block' : 'none',
          textAlign: 'center',
          marginTop: '20px'
        }}>
          <p>認証処理中です。しばらくお待ちください...</p>
        </div>
        
        {/* 3Dセキュア認証コンテナ - 仕様書通りのID設定 */}
        <div id="3dscontainer" style={{
          display: 'none',
          width: '100%',
          minHeight: '450px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          backgroundColor: '#f9f9f9',
          margin: '20px 0'
        }}></div>
      </div>
    </>
  );
}
