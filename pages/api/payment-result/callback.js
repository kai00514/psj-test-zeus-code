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
  console.log('PaRes1 :', paRes);
  paRes = paRes.toString().replace(/"/g, '&quot;').replace(/'/g, '\\\'');
  console.log('PaRes:', paRes);
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
  
  // HTMLレスポンスを返す（単純化したバージョン）
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>3Dセキュア認証完了</title>
  <style>
    body { font-family: sans-serif; margin: 20px; text-align: center; }
    .message { margin: 20px 0; }
    .button { display: inline-block; padding: 10px 20px; background: #4caf50; color: white; border-radius: 4px; text-decoration: none; }
  </style>
  
  <script>
    // ページロード時に自動的に次のページへリダイレクト
    window.onload = function() {
      // まずlocalStorageに確実に保存
      try {
        localStorage.setItem('3ds_auth_result', JSON.stringify({
          MD: '${md}',
          PaRes: '${paRes}',
          status: '${status}',
          timestamp: new Date().toISOString()
        }));
      } catch(e) {
        console.error('ローカルストレージエラー:', e);
      }
      
      // 0.5秒後に親ウィンドウをリダイレクト
      setTimeout(function() {
        try {
          const redirectUrl = '/payment-result?md=${encodeURIComponent(md)}&pares=${encodeURIComponent(paRes)}&status=${encodeURIComponent(status)}&source=callback_direct';
          console.log('リダイレクト先:', redirectUrl);
          window.parent.location.href = redirectUrl;
        } catch(e) {
          console.error('リダイレクトエラー:', e);
          document.getElementById('error-message').style.display = 'block';
        }
      }, 500);
    };
  </script>
</head>
<body>
  <h2>認証処理が完了しました</h2>
  <div class="message">決済結果ページに移動しています...</div>
  
  <div id="error-message" style="display: none; color: #d32f2f; margin: 20px 0;">
    <p>自動的に移動できませんでした。</p>
    <a href="/payment-result?md=${encodeURIComponent(md)}&pares=${encodeURIComponent(paRes)}&status=${encodeURIComponent(status)}&source=manual" class="button">
      こちらをクリックして続行
    </a>
  </div>
</body>
</html>
  `);
  
  console.log('親ウィンドウに通知するHTMLレスポンスを送信しました');
  console.log('=== 3Dセキュアコールバック受信 [END] ===');
}
