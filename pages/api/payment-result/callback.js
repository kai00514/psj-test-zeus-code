// /pages/api/payment-result/callback.js
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const secureApiEndpoint = 'https://linkpt.cardservice.co.jp/cgi-bin/secure/api.cgi';
const clientip = '2019002175';
const key = '11da83f6e7ab803020e74be300ad3761d55f7f74';

export default async function handler(req, res) {
  console.log('=== 3Dセキュアコールバック受信 [START] ===');
  console.log('受信データ 全体:', req.body);
  console.log('受信クエリ:', req.query);
  console.log('受信ヘッダー:', req.headers);
  console.log('リクエストメソッド:', req.method);
  
  // リクエストボディの全プロパティを探索
  console.log('リクエストボディの全プロパティ:');
  Object.keys(req.body).forEach(key => {
    console.log(`${key}: ${typeof req.body[key]} = ${req.body[key]}`);
  });
  
  // 受信データを安全にエスケープ
  const md = (req.body.MD || req.query.MD || '').replace(/"/g, '&quot;').replace(/'/g, '\\\'');
  
  // PaResの詳細な解析
  let paRes = '';
  if (req.body.PaRes) {
    paRes = req.body.PaRes;
    console.log('PaRes found in body.PaRes');
  } else if (req.body.pares) {
    paRes = req.body.pares;
    console.log('PaRes found in body.pares');
  } else if (req.query.PaRes) {
    paRes = req.query.PaRes;
    console.log('PaRes found in query.PaRes');
  } else if (req.query.pares) {
    paRes = req.query.pares;
    console.log('PaRes found in query.pares');
  } else if (req.body.transStatus) {
    paRes = req.body.transStatus;
    console.log('transStatusをPaResとして使用');
  } else {
    // トランザクションIDやその他の情報から可能性のあるPaResを探す
    console.log('標準的なPaResが見つかりません。代替データを探します...');
    if (req.body.threeDSMethodData) {
      paRes = req.body.threeDSMethodData;
      console.log('threeDSMethodDataをPaResとして使用');
    } else if (req.body.cres) {
      paRes = req.body.cres;
      console.log('cresをPaResとして使用');
    } else {
      paRes = 'Y'; // 最後の手段としてデフォルト値
      console.log('PaResが見つからないため、デフォルト値Yを使用');
    }
  }
  
  // トランザクションステータスの解析
  const transStatus = req.body.transStatus || 'Y';
  console.log('トランザクションステータス:', transStatus);
  
  // PaResを安全にエスケープ
  paRes = paRes.toString().replace(/"/g, '&quot;').replace(/'/g, '\\\'');
  const status = (req.body.status || 'success').replace(/"/g, '&quot;').replace(/'/g, '\\\'');
  
  console.log('エスケープ後のデータ:', { md, paRes, status });
  console.log('データ長さ:', { 
    md_length: md.length, 
    paRes_length: paRes.length, 
    status_length: status.length 
  });
  
  // すべてのオリジンを許可する設定
  const parentOrigin = '*';
  
  console.log('親ウィンドウオリジン:', parentOrigin);
  
  // HTMLレスポンスを返して親ウィンドウの関数を呼び出す
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>認証結果</title>
      <script>
        // 即時実行関数でコールバック処理を実行
        (function() {
          console.log('=== コールバックページ JavaScript 実行開始 ===');
          
          // データオブジェクトを作成 - 仕様書通り
          const paymentData = {
            md: "${md}",
            paRes: "${paRes}",  // 認証結果 Y/N
            status: "${status}" // success/failure/invalid/maintenance
          };
          
          console.log('親ウィンドウに送信するデータ:', JSON.stringify(paymentData));
          
          // 親ウィンドウのURLパスを取得
          const parentPath = window.location.origin + "/payment-result";
          console.log('親ウィンドウへリダイレクト予定URL:', parentPath);
          
          // 複数の方法で親ウィンドウに通知を試みる
          function notifyParentWindow() {
            // 1. 親ウィンドウのグローバル関数を直接呼び出し
            try {
              if (window.parent && typeof window.parent._onPaResSuccess === 'function') {
                console.log('親ウィンドウの_onPaResSuccess関数を直接呼び出し');
                window.parent._onPaResSuccess(paymentData);
                return true;
              }
            } catch (e) {
              console.error('親関数呼び出しエラー:', e);
            }
            
            // 2. postMessageを使用
            try {
              console.log('postMessageを使用して親ウィンドウに通知');
              window.parent.postMessage({
                type: '3DS_AUTH_COMPLETE',
                data: paymentData
              }, "*");  // "*"を使用してオリジン制限を緩和
              return true;
            } catch (e) {
              console.error('postMessageエラー:', e);
            }
            
            return false;
          }
          
          // 親ウィンドウ通知を試みる
          const notified = notifyParentWindow();
          
          // 親ウィンドウ通知が失敗した場合または確実性のため、直接APIを呼び出し
          fetch('/api/payment-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
          })
          .then(response => response.json())
          .then(result => {
            console.log('API直接呼び出し結果:', result);
            redirectToResult(result.status || 'success');
          })
          .catch(error => {
            console.error('API呼び出しエラー:', error);
            redirectToResult('failure');
          });
          
          // 最終的な画面遷移処理
          function redirectToResult(resultStatus) {
            // クエリパラメータを構築
            const params = new URLSearchParams();
            params.append('status', resultStatus);
            
            try {
              // トップウィンドウに直接リダイレクト
              const url = '/payment-result?' + params.toString();
              window.top.location.href = url;
            } catch (e) {
              console.error('リダイレクトエラー:', e);
              // フォールバック: 現在のウィンドウで遷移
              window.location.href = '/payment-result?' + params.toString();
            }
          }
          
          // いかなる場合でも3秒後には強制的にリダイレクト
          setTimeout(() => {
            redirectToResult("${status}");
          }, 3000);
        })();
      </script>
    </head>
    <body>
      <h2>認証処理が完了しました</h2>
      <p>自動的に結果ページに移動します。移動しない場合は<a href="/payment-result?status=${status}" id="manual-link">こちら</a>をクリックしてください。</p>
      <div id="debug-info" style="margin-top: 20px; padding: 10px; border: 1px solid #ccc; font-family: monospace;">
        <p>デバッグ情報:</p>
        <pre>MD: ${md}</pre>
        <pre>MD長さ: ${md.length}</pre>
        <pre>PaRes: ${paRes}</pre>
        <pre>PaRes長さ: ${paRes.length}</pre>
        <pre>Status: ${status}</pre>
      </div>
      <script>
        // ユーザーがリンクをクリックできるよう即座に有効化
        document.getElementById('manual-link').onclick = function() {
          redirectToResult('${status}');
          return false;
        };
      </script>
    </body>
    </html>
  `);
  
  console.log('=== 3Dセキュアコールバック受信 [END] ===');
}
