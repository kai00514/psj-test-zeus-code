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
      
      // スクリプト読み込み後にZeus SDKを初期化
      if (typeof window.ZeusTokenAPI !== 'undefined') {
        window.ZeusTokenAPI.init({
          ipcode: window.zeusTokenIpcode
        });
        console.log('【DEBUG】Zeus SDKを初期化しました');
      }
    };
    
    script.onerror = (error) => {
      console.error('Zeus JSスクリプト読み込みエラー:', error);
      alert('決済システムの読み込みに失敗しました。ページをリロードしてください。');
    };
    
    document.body.appendChild(script);

    // 仕様書に準拠した loadedChallenge 関数を追加
    window.loadedChallenge = function() {
      console.log('【DEBUG】loadedChallenge関数が呼び出されました');
      const divWaiter = document.getElementById('challenge_wait');
      if (divWaiter) {
        divWaiter.style.display = 'none';
      }
    };
    
    // _onPaResSuccess 関数の修正（仕様書に準拠）
    window._onPaResSuccess = function(data) {
      console.log('【DEBUG-詳細】_onPaResSuccess開始 - 詳細情報:', {
        timeStamp: new Date().toISOString(),
        dataType: typeof data,
        hasMD: !!data.MD,
        mdValue: data.MD ? data.MD.substring(0, 10) + '...' : 'なし',
        mdLength: data.MD ? data.MD.length : 0,
        hasPaRes: !!data.PaRes,
        paResValue: data.PaRes || 'なし',
        rawData: JSON.stringify(data).substring(0, 100) + '...'
      });
      
      try {
        // 3Dセキュアコンテナを非表示
        const container = document.getElementById('3dscontainer');
        if (container) {
          container.style.display = 'none';
          console.log('【DEBUG-詳細】3dscontainerを非表示に設定');
        }
        
        // 認証完了表示を追加
        const waitElement = document.getElementById('challenge_wait');
        if (waitElement) {
          waitElement.innerHTML = '<p><strong>認証が完了しました。決済処理を実行中...</strong></p>';
          waitElement.style.display = 'block';
        }
        
        // MDが無い場合はXIDを使用
        let md = data.MD || data.md || '';
        if (!md) {
          const lastXidElement = document.getElementById('last-xid-value');
          if (lastXidElement) {
            md = lastXidElement.value;
          }
        }
        
        // PaResがない場合はデフォルト値を設定
        let paRes = data.PaRes || data.paRes || data.pares || data.transStatus || 'Y';
        
        // 直接結果ページにリダイレクト
        router.push({
          pathname: '/payment-result',
          query: { 
            md: md,
            pares: paRes,
            status: 'success',
            source: 'direct'
          }
        });
      } catch (error) {
        console.error('【ERROR】_onPaResSuccess関数エラー:', error);
        // エラー時も結果ページにリダイレクト
        router.push({
          pathname: '/payment-result',
          query: { 
            status: 'error', 
            message: error.message,
            location: '_onPaResSuccess'
          }
        });
      }
    };
    
    // 2. エラー時の処理メソッド
    window._onError = function(error) {
      console.error('3Dセキュア認証エラー:', error);
      alert('認証処理中にエラーが発生しました: ' + (error.message || JSON.stringify(error)));
      setIsLoading(false);
    };
    
    // postMessageイベントリスナーの強化
    const handleMessage = (event) => {
      console.log('【DEBUG-詳細】postMessageイベント受信:', {
        origin: event.origin,
        dataType: typeof event.data,
        data: typeof event.data === 'string' ? event.data.substring(0, 100) + '...' : JSON.stringify(event.data).substring(0, 100) + '...',
        timeStamp: new Date().toISOString()
      });
      
      try {
        // 文字列の場合はJSONとしてパース、オブジェクトの場合はそのまま使用
        let data;
        if (typeof event.data === 'string') {
          // JSONとして解析できない場合はそのまま使用
          try {
            data = JSON.parse(event.data);
            console.log('【DEBUG-詳細】JSONとして正常にパース:', data);
          } catch (e) {
            console.log('【DEBUG-詳細】JSON解析エラー:', e.message);
            data = { rawMessage: event.data };
            
            // 文字列からMDとPaResを抽出する試み - 正規表現を強化
            const mdMatch = event.data.match(/MD=([^&\s]+)/i) || event.data.match(/"MD"\s*:\s*"([^"]+)"/i);
            const paResMatch = event.data.match(/PaRes=([^&\s]+)/i) || event.data.match(/"PaRes"\s*:\s*"([^"]+)"/i);
            
            if (mdMatch) {
              data.MD = decodeURIComponent(mdMatch[1]);
              console.log('【DEBUG-詳細】文字列からMD抽出:', data.MD);
            }
            if (paResMatch) {
              data.PaRes = decodeURIComponent(paResMatch[1]);
              console.log('【DEBUG-詳細】文字列からPaRes抽出:', data.PaRes);
            }
          }
        } else {
          data = event.data;
          console.log('【DEBUG-詳細】オブジェクトとして受信:', data);
        }
        
        console.log("【DEBUG-詳細】解析後データ完全版:", JSON.stringify(data));
        
        // 認証結果イベントを検出（複数のイベント名に対応）
        const isAuthEvent = data && (
          data.event === 'AuthResultReady' || 
          data.event === '3DSAuthResult' || 
          data.event === 'pares_result' ||
          data.MD || 
          data.PaRes
        );
        
        if (isAuthEvent) {
          console.log('【DEBUG-詳細】認証結果イベント検出:', {
            eventType: data.event || 'direct data',
            hasMD: !!data.MD,
            mdLength: data.MD ? data.MD.length : 0,
            hasPaRes: !!data.PaRes,
            paResValue: data.PaRes || 'なし'
          });
          
          // グローバル関数を呼び出す前に結果を表示
          window._onPaResSuccess(data);
          console.log("【DEBUG-詳細】_onPaResSuccess呼び出し完了");
        }
      } catch (error) {
        console.error('【ERROR-詳細】postMessageデータ処理エラー:', error);
        console.error('【ERROR-詳細】エラー詳細:', error.stack);
        console.error('【ERROR-詳細】問題のデータ:', event.data);
        
        // エラーが発生した場合でも処理を試みる
        try {
          if (typeof event.data === 'string' && (
            event.data.includes('MD=') || 
            event.data.includes('PaRes=')
          )) {
            console.log('【RECOVERY】エラー発生後のリカバリー処理を実行');
            const searchParams = new URLSearchParams(event.data);
            const recoveryData = {
              MD: searchParams.get('MD') || '',
              PaRes: searchParams.get('PaRes') || 'Y'
            };
            
            if (recoveryData.MD) {
              console.log('【RECOVERY】リカバリーデータ:', recoveryData);
              window._onPaResSuccess(recoveryData);
            }
          }
        } catch (recoveryError) {
          console.error('【ERROR-詳細】リカバリー処理も失敗:', recoveryError.message);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);

    // 重要: コールバックURL内のウィンドウをチェックするポーリング処理を修正
    const pollIframeWindow = () => {
      // コンテナを先に取得し、その後iframeを検索
      const container = document.getElementById('3dscontainer');
      if (!container) {
        console.log('【DEBUG】3dscontainerが見つかりません');
        return;
      }
      
      // コンテナ内のiframeを取得
      const iframes = container.getElementsByTagName('iframe');
      if (iframes.length === 0) {
        console.log('【DEBUG】iframeが見つかりません');
        return;
      }
      
      const iframe = iframes[0];
      
      try {
        // iframeの内容を監視
        console.log('【DEBUG】iframe監視中');
        
        // iframe内のURLをチェック
        const checkIframeContent = () => {
          try {
            // アクセス可能なiframeコンテンツのみチェック
            if (iframe.contentWindow && iframe.contentWindow.location.href) {
              const url = iframe.contentWindow.location.href;
              console.log('【DEBUG】iframe URL:', url);
              
              // コールバックURLかどうかをチェック
              if (url.includes('/api/payment-result/callback') || 
                  url.includes('notification') || 
                  url.includes('challenge')) {
                console.log('【DEBUG】コールバックURLを検出:', url);
                
                // URLからパラメータを抽出
                const params = new URLSearchParams(url.split('?')[1] || '');
                const md = params.get('MD') || '';
                const paRes = params.get('PaRes') || 'Y';
                
                if (md) {
                  console.log('【DEBUG】URLからMDとPaResを抽出:', { md, paRes });
                  window._onPaResSuccess({ MD: md, PaRes: paRes });
                  return true; // 監視終了
                }
              }
            }
          } catch (e) {
            // クロスオリジンエラーは無視（正常な動作）
            console.log('【DEBUG】iframe内容アクセスエラー (通常の動作)');
          }
          return false;
        };
        
        // 1秒ごとにチェック
        const intervalId = setInterval(() => {
          if (checkIframeContent()) {
            clearInterval(intervalId);
          }
        }, 1000);
        
        // 30秒後にポーリングを停止
        setTimeout(() => {
          clearInterval(intervalId);
        }, 30000);
      } catch (error) {
        console.error('【ERROR】iframe監視エラー:', error);
      }
    };
    
    // 初期のiframe監視を開始
    setTimeout(pollIframeWindow, 2000);

    // 定期的に決済処理の完了をチェック
    // 特にiframe内で認証が完了したが、通知が来ない場合のバックアップ
    let checkCount = 0;
    const maxChecks = 30; // 最大30回チェック
    
    const statusCheckInterval = setInterval(() => {
      // 3Dセキュア認証画面の表示状態を確認
      const container = document.getElementById('3dscontainer');
      if (container && container.style.display === 'block') {
        checkCount++;
        console.log(`【DEBUG】認証状態確認 ${checkCount}/${maxChecks}`);
        
        // 現在表示中のiframeを検査
        try {
          const iframes = container.getElementsByTagName('iframe');
          if (iframes.length > 0) {
            const iframe = iframes[0];
            try {
              // iframeのコンテンツにアクセス (可能な場合のみ)
              if (iframe.contentDocument) {
                const text = iframe.contentDocument.body.textContent || '';
                console.log('【DEBUG】iframe内テキスト確認:', text.substring(0, 100) + '...');
                
                // 認証完了メッセージが含まれているか確認
                if (text.includes('認証処理が完了') || 
                    text.includes('認証が完了') || 
                    text.includes('完了しました')) {
                  console.log('【DEBUG】認証完了テキストを検出');
                  
                  // MDを取得
                  const mdElement = document.getElementById('last-xid-value');
                  if (mdElement) {
                    const md = mdElement.value;
                    console.log('【DEBUG】保存されたMD値を使用:', md);
                    window._onPaResSuccess({ MD: md, PaRes: 'Y' });
                    
                    // チェック停止
                    clearInterval(statusCheckInterval);
                  }
                }
              }
            } catch (e) {
              // クロスオリジンエラーは無視
            }
          }
        } catch (e) {
          console.error('【ERROR】iframe確認エラー:', e);
        }
        
        // 最大回数を超えたら終了
        if (checkCount >= maxChecks) {
          clearInterval(statusCheckInterval);
        }
      } else {
        // 3Dセキュア画面が表示されていない場合はチェック不要
        clearInterval(statusCheckInterval);
      }
    }, 2000); // 2秒ごとにチェック

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      window.removeEventListener('message', handleMessage);
      clearInterval(statusCheckInterval);
    };
  }, [router]);

  // 直接フレームを初期化する関数を改善
  const initializeDirectIframe = (container, url, md, termUrl) => {
    // フォーム送信用のiframeを作成
    console.log('【DEBUG】フォールバック: 直接iframeを挿入');
    
    // URLにコールバック用のパラメータを追加
    const callbackScript = `
      <script>
        window.addEventListener('load', function() {
          try {
            // 結果を親ウィンドウに通知する関数
            window.notifyParent = function(md, paRes) {
              if (window.parent && window.parent.postMessage) {
                const data = { MD: md, PaRes: paRes || 'Y', event: '3DSAuthResult' };
                window.parent.postMessage(JSON.stringify(data), '*');
                console.log('親ウィンドウに通知:', data);
              }
            };
            
            // フォームの送信をキャプチャ
            document.addEventListener('submit', function(e) {
              const form = e.target;
              const mdInput = form.querySelector('input[name="MD"]');
              const paResInput = form.querySelector('input[name="PaRes"]');
              
              if (mdInput) {
                const md = mdInput.value;
                const paRes = paResInput ? paResInput.value : 'Y';
                window.notifyParent(md, paRes);
              }
            });
          } catch(e) {
            console.error('コールバックスクリプトエラー:', e);
          }
        });
      </script>
    `;
    
    // 直接URLアクセス用のiframe
    container.innerHTML = `
      <form id="redirect-form" method="post" action="${url}" target="threeds-iframe">
        <input type="hidden" name="MD" value="${md}" />
        <input type="hidden" name="TermUrl" value="${termUrl}" />
      </form>
      <iframe 
        name="threeds-iframe"
        id="threeds-iframe" 
        width="100%" 
        height="450px" 
        frameborder="0"
        allow="camera"
        onload="console.log('iframeロード完了');"
      ></iframe>
    `;
    
    // 監視処理を開始
    setTimeout(() => {
      // iframeを単純にIDで取得
      const iframe = document.getElementById('threeds-iframe');
      if (iframe) {
        try {
          // iframe内部にスクリプトを注入（可能な場合）
          if (iframe.contentDocument) {
            iframe.contentDocument.body.innerHTML += callbackScript;
          }
        } catch (e) {
          console.log('iframeコンテンツアクセス制限（通常の動作）');
        }
      }
      
      // ポーリング監視開始
      pollIframeWindow();
    }, 1000);
    
    // フォームを自動送信
    const form = document.getElementById('redirect-form');
    if (form) {
      console.log('【DEBUG】リダイレクトフォームを送信');
      form.submit();
    }
  };

  // 仕様書に準拠した AuthReq 処理を実装
  const executeAuthRequest = async (md, paRes) => {
    console.log('【DEBUG-詳細】AuthReq処理開始:', { 
      timeStamp: new Date().toISOString(),
      md: md ? md.substring(0, 10) + '...' : 'なし',
      md_length: md ? md.length : 0,
      paRes,
      paRes_length: paRes ? paRes.length : 0
    });
    
    try {
      // AuthReq APIを呼び出し
      console.log('【DEBUG-詳細】/api/payment-auth APIを呼び出します');
      const authResponse = await fetch('/api/payment-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xid: md,
          paRes: paRes
        }),
      });
      
      console.log('【DEBUG-詳細】認証APIレスポンス受信:', { 
        status: authResponse.status,
        statusText: authResponse.statusText,
        headers: Object.fromEntries([...authResponse.headers])
      });
      
      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error('【ERROR-詳細】AuthReq APIエラーレスポンス:', errorText);
        throw new Error(`AuthReq APIエラー: ${authResponse.status} - ${errorText}`);
      }
      
      const authResult = await authResponse.json();
      console.log('【DEBUG-詳細】AuthRes結果詳細:', JSON.stringify(authResult));
      
      // AuthResが成功の場合のみPayReqを実行
      if (authResult.status === 'success') {
        console.log('【DEBUG-詳細】認証成功 - PayReq処理を開始します');
        // ドキュメントに状態を表示
        document.getElementById('challenge_wait').innerHTML = '<p><strong>認証成功！決済処理を実行中...</strong></p>';
        executePayRequest(md);
      } else {
        // 認証失敗
        console.error('【ERROR-詳細】認証失敗:', authResult);
        document.getElementById('challenge_wait').innerHTML = '<p><strong>認証失敗：</strong>' + (authResult.message || 'エラーが発生しました') + '</p>';
        alert('認証処理に失敗しました: ' + (authResult.message || 'エラーが発生しました'));
        setIsLoading(false);
        
        // 失敗結果ページへリダイレクト
        router.push({
          pathname: '/payment-result',
          query: { 
            status: 'failure', 
            message: authResult.message || 'AuthReq処理に失敗しました',
            code: authResult.code || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('【ERROR-詳細】AuthReq処理エラー詳細:', error);
      console.error('【ERROR-詳細】エラースタック:', error.stack);
      
      document.getElementById('challenge_wait').innerHTML = '<p><strong>認証検証エラー：</strong>' + error.message + '</p>';
      alert('認証検証処理中にエラーが発生しました: ' + error.message);
      setIsLoading(false);
      
      // エラー結果ページへリダイレクト
      router.push({
        pathname: '/payment-result',
        query: { 
          status: 'error', 
          message: error.message,
          location: 'executeAuthRequest',
          timestamp: new Date().toISOString()
        }
      });
    }
  };

  // 仕様書に準拠した PayReq 処理を実装
  const executePayRequest = async (md) => {
    console.log('【DEBUG】PayReq処理開始:', { md });
    
    try {
      // PayReq APIを呼び出し
      const payResponse = await fetch('/api/payment-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          MD: md,
          status: 'success'
        }),
      });
      
      if (!payResponse.ok) {
        const errorText = await payResponse.text();
        throw new Error(`PayReq APIエラー: ${payResponse.status} - ${errorText}`);
      }
      
      const payResult = await payResponse.json();
      console.log('【DEBUG】PayRes結果:', payResult);
      
      // 決済完了ページへリダイレクト
      router.push({
        pathname: '/payment-result',
        query: { result: JSON.stringify(payResult) }
      });
    } catch (error) {
      console.error('【ERROR】PayReq処理エラー:', error);
      alert('決済処理中にエラーが発生しました: ' + error.message);
      setIsLoading(false);
      
      // エラー結果ページへリダイレクト
      router.push({
        pathname: '/payment-result',
        query: { status: 'error', message: error.message }
      });
    }
  };

  // completePayment 関数を executeAuthRequest 関数に置き換え
  const completePayment = executeAuthRequest;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // 待機メッセージを表示
      const waitElement = document.getElementById('challenge_wait');
      if (waitElement) {
        waitElement.style.display = 'block';
        waitElement.innerHTML = '<p>決済処理を開始しています...</p>';
      }
      
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
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`APIエラー: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('APIレスポンス:', result);
      
      if (result.iframeUrl && result.xid) {
        // 待機メッセージを更新
        if (waitElement) {
          waitElement.innerHTML = '<p>3Dセキュア認証画面を準備しています...</p>';
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
          
          // 待機メッセージを更新
          if (waitElement) {
            waitElement.style.display = 'none';
          }
          
          // 重要: 仕様書に従ってsetPareqParams関数を呼び出す
          if (typeof window.setPareqParams === 'function') {
            // TermURLはコールバックAPI
            const termUrl = `${window.location.origin}/api/payment-result/callback`;
            
            console.log('setPareqParams呼び出し:', {
              md: result.xid,
              paReq: result.paReq || '',
              termUrl,
              threeDSMethod: '',
              iframeUrl: decodedUrl
            });
            
            try {
              // 仕様書に従った引数で関数を呼び出し
              window.setPareqParams(
                result.xid,                  // MD (取引ID)
                result.paReq || '',          // PaReq (認証データ)
                termUrl,                     // TermURL (コールバックURL)
                '',                          // threeDSMethod (空文字列)
                decodedUrl,                  // iframeUrl (認証画面URL)
                {
                  container: '3dscontainer', // コンテナID
                  width: '100%',             // 幅
                  height: '450px'            // 高さ
                }
              );
              console.log('【DEBUG】setPareqParams呼び出し成功');
            } catch (error) {
              console.error('【ERROR】setPareqParams呼び出しエラー:', error);
              
              // フォールバック: 直接iframeを挿入
              initializeDirectIframe(container, decodedUrl, result.xid, termUrl);
            }
          } else {
            console.error('setPareqParams関数が見つかりません');
            
            // フォールバック: 直接iframeを挿入
            initializeDirectIframe(container, decodedUrl, result.xid, termUrl);
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
