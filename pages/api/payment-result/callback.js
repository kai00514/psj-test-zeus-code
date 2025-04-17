// /pages/api/payment-result/callback.js
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const secureApiEndpoint = 'https://linkpt.cardservice.co.jp/cgi-bin/secure/api.cgi';
const clientip = '2019002175';
const key = '11da83f6e7ab803020e74be300ad3761d55f7f74';

export default async function handler(req, res) {
  console.log('=== 3Dセキュアコールバック受信 [START] ===');
  
  // MDとPaResの取得ロジックを強化
  let md = null;
  let paRes = null;
  
  // クエリパラメータから取得を試みる（大文字・小文字の両方）
  if (req.query.MD || req.query.md) {
    md = req.query.MD || req.query.md;
    console.log('【DEBUG】クエリパラメータからMDを取得:', md);
  }
  
  if (req.query.PaRes || req.query.pares || req.query.paRes) {
    paRes = req.query.PaRes || req.query.pares || req.query.paRes;
    console.log('【DEBUG】クエリパラメータからPaResを取得:', paRes);
  }
  
  // ボディから取得を試みる（大文字・小文字の両方）
  if (!md && req.body) {
    if (typeof req.body === 'string') {
      try {
        const parsedBody = JSON.parse(req.body);
        md = parsedBody.MD || parsedBody.md;
        paRes = parsedBody.PaRes || parsedBody.paRes || parsedBody.pares;
      } catch (e) {
        console.log('【DEBUG】ボディをJSONとしてパースできません:', e);
      }
    } else if (typeof req.body === 'object') {
      md = req.body.MD || req.body.md;
      paRes = req.body.PaRes || req.body.paRes || req.body.pares;
    }
    
    if (md) console.log('【DEBUG】ボディからMDを取得:', md);
    if (paRes) console.log('【DEBUG】ボディからPaResを取得:', paRes);
  }
  
  // フォームデータからの取得も試みる
  if (!md && req.body && typeof req.body === 'object') {
    const bodyKeys = Object.keys(req.body).map(k => k.toLowerCase());
    for (const key of bodyKeys) {
      if (key.toLowerCase() === 'md') md = req.body[key];
      if (key.toLowerCase() === 'pares') paRes = req.body[key];
    }
    
    if (md) console.log('【DEBUG】フォームデータからMDを取得:', md);
    if (paRes) console.log('【DEBUG】フォームデータからPaResを取得:', paRes);
  }
  
  console.log('【CRITICAL】最終的な認証データ:', { md, paRes });
  
  // レスポンスは親ウィンドウに通知するJavaScriptを含むHTML
  res.setHeader('Content-Type', 'text/html');
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>3Dセキュア認証結果</title>
  <script>
    // 超強化デバッグログ
    console.log('[コールバックページ] 初期化時刻:', new Date().toISOString());
    console.log('[コールバックページ] 認証データ:', { MD: '${md || "未取得"}', PaRes: '${paRes || "未取得"}' });
    console.log('[コールバックページ] 親ウィンドウアクセス:', window.parent ? 'アクセス可能' : 'アクセス不可');
    console.log('[コールバックページ] location:', window.location.href);
    
    // 3種類の方法で親ウィンドウに通知を試みる
    function notifyParent() {
      try {
        // 方法1: 直接関数呼び出し
        if (window.parent && window.parent._onPaResSuccess) {
          console.log('[コールバックページ] 親ウィンドウの_onPaResSuccess関数を呼び出します');
          window.parent._onPaResSuccess({
            MD: '${md || ""}',
            PaRes: '${paRes || "Y"}'
          });
          console.log('[コールバックページ] 親ウィンドウの関数呼び出し完了');
          return true;
        } 
        // 方法2: postMessage
        else if (window.parent && window.parent.postMessage) {
          console.log('[コールバックページ] postMessageで親ウィンドウに通知します');
          window.parent.postMessage({
            type: 'PARES_SUCCESS',
            data: { MD: '${md || ""}', PaRes: '${paRes || "Y"}' }
          }, '*');
          console.log('[コールバックページ] postMessage送信完了');
          return true;
        }
        // 方法3: グローバル変数経由
        else if (window.parent) {
          console.log('[コールバックページ] グローバル変数で通知を試みます');
          try {
            window.parent.callbackData = { MD: '${md || ""}', PaRes: '${paRes || "Y"}' };
            window.parent.callbackReceived = true;
            console.log('[コールバックページ] グローバル変数設定完了');
            return true;
          } catch (ex) {
            console.error('[コールバックページ] グローバル変数設定失敗:', ex);
            return false;
          }
        }
        else {
          console.error('[コールバックページ] 親ウィンドウとの通信方法が見つかりません');
          return false;
        }
      } catch (e) {
        console.error('[コールバックページ] 親ウィンドウへの通知エラー:', e);
        return false;
      }
    }
    
    // 即時実行して、失敗したら500ミリ秒後に再試行
    if (!notifyParent()) {
      console.log('[コールバックページ] 初回通知失敗。500ms後に再試行します');
      setTimeout(notifyParent, 500);
    }
  </script>
</head>
<body>
  <h2>3Dセキュア認証結果</h2>
  <p>認証が完了しました。ブラウザを閉じないでください...</p>
  <div id="debug-data" style="margin-top: 20px; font-size: 12px; color: #666;">
    <p>デバッグ情報：</p>
    <pre>MD: ${md || "取得できませんでした"}\nPaRes: ${paRes || "取得できませんでした"}</pre>
  </div>
</body>
</html>
`;
  res.status(200).send(html);
  
  console.log('=== 3Dセキュアコールバック受信 [END] ===');
  console.log('【DEBUG】リクエストボディ全体:', req.body);
}
