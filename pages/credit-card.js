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

    // スクリプトの読み込み - セキュリティコードなし、トークン決済あり
    const script = document.createElement('script');
    script.src = 'https://linkpt.cardservice.co.jp/api/token/2.0/zeus_token2.js';
    script.type = 'text/javascript';
    
    // スクリプトのロード完了を検知
    script.onload = () => {
      setIsScriptLoaded(true);
      console.log('Zeus JS読み込み完了');
    };
    
    document.body.appendChild(script);

    // 仕様書で要求されるグローバル関数の実装
    window._onPaResSuccess = async function(data) {
      console.log('=== _onPaResSuccess() グローバル関数呼び出し [START] ===');
      console.log('受信データ:', data);
      
      // 渡されたデータがオブジェクトでない場合の対応
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.error('データの解析に失敗:', e);
        }
      }
      
      // MD値の存在確認
      if (!data || !data.MD) {
        console.error('無効なデータ形式:', data);
        router.push('/payment-result?status=failure&reason=invalid_data');
        return;
      }
      
      try {
        // APIリクエストを送信
        console.log('決済完了APIを呼び出し中...');
        const response = await fetch('/api/payment-result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            MD: data.MD || data.md,
            PaRes: data.PaRes || data.paRes || 'Y',
            status: data.status || 'success'
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('決済APIレスポンス:', result);
        
        // 成功したら結果ページへ遷移
        const url = `/payment-result?status=${result.status}`;
        if (result.orderNumber) {
          url += `&orderNumber=${result.orderNumber}`;
        }
        console.log('リダイレクト先:', url);
        
        // 即座にリダイレクト実行
        window.location.href = url;
      } catch (error) {
        console.error('決済完了処理エラー:', error);
        window.location.href = '/payment-result?status=failure';
      } finally {
        setIsLoading(false);
      }
    };

    window._onError = (error) => {
      console.error('=== _onError() 3Dセキュアエラー ===');
      console.error('エラー詳細:', error);
      
      setIsLoading(false);
      alert('認証処理中にエラーが発生しました。');
      router.push('/payment-result?status=failure');
    };

    // チャレンジ画面がロードされた際に呼ばれる
    window.loadedChallenge = () => {
      console.log('チャレンジフレーム読み込み完了');
      const waitDiv = document.getElementById('challenge_wait');
      if (waitDiv) {
        waitDiv.style.display = 'none';
      }
    };

    // postMessageリスナーを追加
    const handleMessage = (event) => {
      console.log('=== postMessageを受信 [START] ===');
      console.log('イベントオリジン:', event.origin);
      console.log('イベントデータ:', event.data);
      
      // Zeus決済システムからのメッセージ形式を処理
      if (event.data && event.data.event === 'AuthResultReady') {
        console.log('=== Zeus認証完了メッセージを受信 ===');
        console.log('Zeus認証データ:', event.data);
        
        // MDの取得（iframeのURLパラメータから）
        const container = document.getElementById('3dscontainer');
        console.log('3DSコンテナ要素:', container);
        
        const iframe = container?.querySelector('iframe');
        console.log('iframe要素:', iframe);
        console.log('iframe src:', iframe?.src);
        
        let md = '';
        
        if (iframe && iframe.src) {
          try {
            const url = new URL(iframe.src);
            console.log('iframe URL解析結果:', url);
            console.log('URL検索パラメータ:', Array.from(url.searchParams.entries()));
            
            md = url.searchParams.get('MD') || '';
            console.log('URLからのMD:', md);
            
            // transIdからMDを取得する試み
            const transId = url.searchParams.get('transId');
            console.log('URLからのtransId:', transId);
            
            if (!md && transId) {
              // transIdをMDとして使用する可能性
              console.log('transIdをMDとして使用を検討');
            }
          } catch (e) {
            console.error('URL解析エラー:', e);
          }
        }
        
        // 最終的なMD値の確認
        console.log('最終的に使用するMD:', md || 'EnrolReqから取得したxidを使用予定');
        
        // 認証結果を処理
        const authData = {
          md: md || document.getElementById('last-xid-value')?.value || '',
          paRes: event.data.transStatus || 'Y',
          status: event.data.transStatus === 'Y' ? 'success' : 'failure'
        };
        
        console.log('_onPaResSuccessに渡すデータ:', authData);
        window._onPaResSuccess(authData);
        console.log('=== Zeus認証完了メッセージ処理完了 ===');
        return;
      }
      
      // 自作コールバックページからのメッセージ形式を処理
      if (event.data && event.data.type === '3DS_AUTH_COMPLETE') {
        console.log('=== 3Dセキュア認証完了メッセージを受信 ===');
        console.log('認証完了データ:', event.data.data);
        window._onPaResSuccess(event.data.data);
        console.log('=== 3Dセキュア認証完了メッセージ処理完了 ===');
      }
      
      console.log('=== postMessageを受信 [END] ===');
    };
    
    window.addEventListener('message', handleMessage);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      window.removeEventListener('message', handleMessage);
    };
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== 決済処理開始 [START] ===');
    
    if (!isScriptLoaded) {
      console.error('決済システムの読み込みが完了していません');
      alert('決済システムの読み込みが完了していません。しばらくお待ちください。');
      return;
    }

    setIsLoading(true);
    console.log('入力データ:', { cardNumber, expiryYear, expiryMonth, cardHolder, amount });

    try {
      console.log('EnrolReq処理開始...');
      // EnrolReqの実行
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

      console.log('EnrolReqレスポンス受信:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('EnrolReqエラーレスポンス:', errorText);
        throw new Error('決済開始処理に失敗しました');
      }

      const data = await response.json();
      console.log('EnrolReqレスポンスデータ:', data);
      
      // EnrolReqの結果をチェック
      if (!data.xid || !data.iframeUrl) {
        console.error('必要な認証情報が不足:', data);
        throw new Error('必要な認証情報が取得できませんでした');
      }

      console.log('EnrolReq レスポンス:', data);
      
      // xidを隠しフィールドに保存（後で使用するため）
      console.log('xidを保存:', data.xid);
      const hiddenField = document.createElement('input');
      hiddenField.type = 'hidden';
      hiddenField.id = 'last-xid-value';
      hiddenField.value = data.xid;
      document.body.appendChild(hiddenField);

      // iframeURLの処理を修正
      let iframeUrl = data.iframeUrl;
      // URLがエンコードされている場合はデコード
      if (iframeUrl.includes('%')) {
        iframeUrl = decodeURIComponent(iframeUrl);
      }
      console.log('処理後のiframeUrl:', iframeUrl);

      console.log('=== 3Dセキュア認証開始 ===');
      console.log('認証パラメータ:', {
        md: data.xid,
        iframeUrl: iframeUrl,
        termUrl: `${window.location.origin}/api/payment-result/callback`
      });

      // 3DSコンテナを事前に準備
      const container = document.getElementById('3dscontainer');
      if (container) {
        // コンテナを表示状態に
        container.style.display = 'block';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.zIndex = '1000';
        container.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        console.log('3DSコンテナを表示状態に設定しました');
      }

      // setPareqParamsの呼び出しを修正
      console.log('setPareqParams関数呼び出し前...');
      console.log('setPareqParams関数存在確認:', typeof window.setPareqParams);

      if (typeof window.setPareqParams !== 'function') {
        console.error('setPareqParams関数が見つかりません。代替手段を使用します。');
        
        if (container) {
          // 直接iframeを作成
          container.innerHTML = `
            <div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center; flex-direction:column;">
              <iframe 
                src="${iframeUrl}" 
                style="width:90%; height:80%; border:1px solid #ccc; border-radius:5px;"
                id="3ds-iframe"
              ></iframe>
              <p style="margin-top:10px;">認証画面が表示されない場合は<a href="${iframeUrl}" target="_blank">こちら</a>をクリックしてください</p>
            </div>
          `;
          console.log('代替手段でiframeを作成しました');
        }
      } else {
        // 仕様書に準拠したsetPareqParams呼び出し
        window.setPareqParams(
          data.xid,         // md: EnrolResのxid
          'PaReq',          // paReq: 固定値「PaReq」
          `${window.location.origin}/api/payment-result/callback`, // termUrl: コールバックURL
          '2',              // threeDSMethod: ユーザーが'2'を指定
          iframeUrl,        // iframeUrl: EnrolResのiframeUrl
          () => {
            console.log('setPareqParams 成功 - 認証画面が表示されます');
            // 成功時にコンテナが表示されていることを確認
            if (container && container.style.display !== 'block') {
              container.style.display = 'block';
            }
            console.log('3DSコンテナの状態:', {
              display: container?.style.display,
              exists: !!container,
              innerHTML: container?.innerHTML || 'empty'
            });
          },
          (error) => {
            console.error('setPareqParams エラー:', error);
            
            // エラー時に代替手段を試す
            console.log('エラーが発生したため代替手段を試みます');
            if (container) {
              // 直接iframeを作成
              container.innerHTML = `
                <div style="width:100%; height:100%; display:flex; justify-content:center; align-items:center; flex-direction:column;">
                  <iframe 
                    src="${iframeUrl}" 
                    style="width:90%; height:80%; border:1px solid #ccc; border-radius:5px;"
                    id="3ds-iframe"
                  ></iframe>
                  <p style="margin-top:10px;">認証画面が表示されない場合は<a href="${iframeUrl}" target="_blank">こちら</a>をクリックしてください</p>
                  <button onclick="document.getElementById('3dscontainer').style.display='none';" style="margin-top:10px; padding:5px 10px;">キャンセル</button>
                </div>
              `;
              console.log('エラー後の代替手段でiframeを作成しました');
            }
            
            // エラーメッセージは表示するが、処理は継続
            console.error('setPareqParams エラー（代替手段を使用中）:', error);
          }
        );
      }

    } catch (error) {
      console.error('決済処理エラー:', error);
      console.error('エラースタック:', error.stack);
      setIsLoading(false);
      alert('決済処理中にエラーが発生しました: ' + error.message);
    }
    
    console.log('=== 決済処理開始 [END] ===');
  };

  // 3Dセキュアのiframe表示用の関数を追加
  const setupChallengeContainer = () => {
    const container = document.getElementById('3dscontainer');
    if (container) {
      // コンテナのスタイルを設定
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.height = '100%';
      container.style.zIndex = '1000';
      container.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      container.style.display = 'block'; // 明示的に表示
      
      console.log('3DSコンテナをセットアップしました:', {
        display: container.style.display,
        zIndex: container.style.zIndex,
        position: container.style.position
      });
    } else {
      console.error('3DSコンテナが見つかりません');
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

        {/* チャレンジフロー待機メッセージ - 仕様書通りのID設定 */}
        <div id="challenge_wait" style={{ 
          display: isLoading ? 'block' : 'none',
          textAlign: 'center',
          marginTop: '20px'
        }}>
          <p>認証処理中です。しばらくお待ちください...</p>
        </div>
        
        {/* 3Dセキュア用コンテナ - 仕様書通りのID設定 */}
        <div id="3dscontainer" style={{ 
          display: isLoading ? 'block' : 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '20px',
          borderRadius: '5px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}></div>
      </div>
    </>
  );
}
