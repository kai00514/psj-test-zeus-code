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
  
  // HTMLレスポンスを返して親ウィンドウの関数を呼び出す
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>3Dセキュア認証完了</title>
  <style>
    body { font-family: sans-serif; margin: 20px; }
    .debug-info { background: #f5f5f5; padding: 10px; margin-top: 20px; font-size: 12px; }
    .btn { display: inline-block; padding: 8px 16px; background: #4caf50; color: white; text-decoration: none; border-radius: 4px; }
    pre { white-space: pre-wrap; word-break: break-all; }
  </style>
</head>
<body>
  <h3>認証処理が完了しました</h3>
  <p id="notify-status">親ウィンドウへの通知準備中...</p>
  
  <p>自動的に結果ページに移動します。移動しない場合は<a href="javascript:void(0);" onclick="window.parent.location.href='/payment-result?md=${encodeURIComponent(md)}&pares=${encodeURIComponent(paRes)}&status=${encodeURIComponent(status)}';" class="btn">こちら</a>をクリックしてください。</p>
  
  <div class="debug-info">
    <h4>通信ステータス:</h4>
    <p>方法1 (直接呼び出し): <span id="method1-status">未実行</span></p>
    <p>方法2 (postMessage): <span id="method2-status">未実行</span></p>
    <p>方法3 (localStorage): <span id="method3-status">未実行</span></p>
    <p>ドメイン情報: <span id="domain-info">取得中...</span></p>
    <p>フォールバック: <span id="fallback-status">待機中...</span></p>
    
    <h4>localStorage確認:</h4>
    <pre id="localStorage-data" style="word-break: break-all; max-width: 100%; overflow-wrap: break-word;">未保存</pre>
    
    <h4>デバッグ情報:</h4>
    <p>MD: ${md.substring(0, 10)}...（${md.length}文字）</p>
    <p>PaRes: ${paRes}</p>
    <p>Status: ${status}</p>
    <p>タイムスタンプ: <span id="timestamp"></span></p>
  </div>

  <!-- スクリプトはbodyの最後に移動 -->
  <script>
    // タイムスタンプを設定
    document.getElementById('timestamp').textContent = new Date().toISOString();
    
    // エラー詳細取得関数
    function getErrorDetails(error) {
      return {
        message: error.message || '不明なエラー',
        name: error.name,
        stack: error.stack,
        toString: error.toString()
      };
    }

    // DOMContentLoadedイベントでスクリプトを実行
    document.addEventListener('DOMContentLoaded', function() {
      console.log('[CALLBACK-詳細] DOMが完全にロードされました - 通知処理を開始します');
      
      // 親ウィンドウへの通信を複数の方法で試行
      function notifyParentWindow() {
        console.log('[CALLBACK-詳細] 親ウィンドウへの通知を開始します:', {
          timeStamp: new Date().toISOString(),
          MD: '${md}' ? '${md}'.substring(0, 10) + '...' : 'なし',
          MD_length: '${md}'.length,
          PaRes: '${paRes}' || 'なし',
          status: '${status}'
        });
        
        // 結果データ
        const resultData = {
          MD: '${md}',
          PaRes: '${paRes}',
          status: '${status}',
          event: 'pares_result',
          timestamp: new Date().toISOString()
        };
        
        // すべての通知方法を試行し、成功したものをカウント
        let successCount = 0;
        
        try {
          // 方法1: 親ウィンドウのグローバル関数を直接呼び出し
          console.log('[CALLBACK-詳細] 方法1: 親ウィンドウのグローバル関数を直接呼び出し');
          document.getElementById('method1-status').textContent = '実行中...';
          
          if (window.parent && typeof window.parent._onPaResSuccess === 'function') {
            window.parent._onPaResSuccess(resultData);
            console.log('[CALLBACK-詳細] _onPaResSuccess関数の呼び出しに成功しました');
            document.getElementById('method1-status').textContent = '成功';
            successCount++;
          } else {
            console.error('[CALLBACK-詳細] 親ウィンドウに_onPaResSuccess関数が見つかりません');
            document.getElementById('method1-status').textContent = '失敗 - 関数未定義';
          }
        } catch (e) {
          console.error('[CALLBACK-詳細] 親ウィンドウの関数呼び出しエラー:', getErrorDetails(e));
          document.getElementById('method1-status').textContent = '失敗 - ' + e.message;
        }
        
        try {
          // 方法2: postMessageを使用（すべてのオリジンに送信）
          console.log('[CALLBACK-詳細] 方法2: postMessageで通知を試みます');
          // まずJSON文字列として送信
          window.parent.postMessage(JSON.stringify(resultData), '*');
          // 次にオブジェクトとして送信
          window.parent.postMessage(resultData, '*');
          console.log('[CALLBACK-詳細] postMessageの送信に成功しました');
          document.getElementById('method2-status').textContent = '成功';
          successCount++;
        } catch (e) {
          console.error('[CALLBACK-詳細] postMessageエラー:', getErrorDetails(e));
          document.getElementById('method2-status').textContent = '失敗 - ' + e.message;
        }
        
        try {
          // 方法3: ローカルストレージを使用
          console.log('[CALLBACK-詳細] 方法3: ローカルストレージを使用した通知を試みます');
          localStorage.setItem('3ds_auth_result', JSON.stringify(resultData));
          console.log('[CALLBACK-詳細] ローカルストレージへの保存に成功しました');
          document.getElementById('method3-status').textContent = '成功 (DOMContentLoaded)';
          document.getElementById('localStorage-data').textContent = JSON.stringify(resultData);
          successCount++;
        } catch (e) {
          console.error('[CALLBACK-詳細] ローカルストレージエラー:', getErrorDetails(e));
          document.getElementById('method3-status').textContent = '失敗 - ' + e.message;
        }
        
        // 結果表示を更新
        document.getElementById('notify-status').textContent = successCount > 0 
          ? '<span class="success-message">通知成功 (' + successCount + '/3方法)</span>' 
          : '<span class="alert">すべての通知方法が失敗しました</span>';
        
        console.log('[CALLBACK-詳細] 親ウィンドウへの通知試行結果:', {
          試行方法数: 3,
          成功数: successCount,
          timeStamp: new Date().toISOString()
        });
        
        return successCount > 0;
      }
      
      // 関数を即時実行
      notifyParentWindow();
    });
    
    // ページロード完了時にも再度実行を試みる（DOMContentLoadedよりも遅いタイミング）
    window.onload = function() {
      console.log('[CALLBACK-詳細] window.onloadイベント発生');
      // エラーが発生してもその他の処理を続行できるよう、try-catchで囲む
      try {
        const notifyStatus = document.getElementById('notify-status');
        if (notifyStatus) {
          notifyStatus.textContent = 'ページロード完了 - 親ウィンドウに通知を送信中...';
        }
        
        // LocalStorageに直接保存（最も基本的なフォールバック）
        try {
          const resultData = {
            MD: '${md}',
            PaRes: '${paRes}',
            status: '${status}',
            timestamp: new Date().toISOString(),
            source: 'window.onload'
          };
          localStorage.setItem('3ds_auth_result', JSON.stringify(resultData));
          document.getElementById('method3-status').textContent = '成功 (onload)';
          document.getElementById('localStorage-data').textContent = JSON.stringify(resultData);
        } catch (e) {
          console.error('[CALLBACK-詳細] onloadでのlocalStorage保存エラー:', e);
        }
      } catch (e) {
        console.error('[CALLBACK-詳細] onloadイベントエラー:', e);
      }
    };
  </script>
</body>
</html>
  `);
  
  console.log('親ウィンドウに通知するHTMLレスポンスを送信しました');
  console.log('=== 3Dセキュアコールバック受信 [END] ===');
}
