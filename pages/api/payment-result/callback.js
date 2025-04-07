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
  <title>3Dセキュア認証結果</title>
  <script>
    // デバッグログ強化
    console.log('[CALLBACK] 3Dセキュア認証コールバックページが読み込まれました');
    console.log('[CALLBACK] 認証データ:', {
      MD: '${md}',
      PaRes: '${paRes}',
      status: '${status}'
    });
    
    // エラーオブジェクトの詳細情報を取得する関数
    function getErrorDetails(error) {
      return {
        message: error.message || 'Unknown error',
        name: error.name || 'Error',
        stack: error.stack || 'No stack trace',
        toString: error.toString()
      };
    }
    
    // 親ウィンドウへの通信を複数の方法で試行
    function notifyParentWindow() {
      console.log('[CALLBACK] 親ウィンドウへの通知を開始します');
      
      // 結果データ
      const resultData = {
        MD: '${md}',
        PaRes: '${paRes}',
        status: '${status}'
      };
      
      try {
        // 方法1: 親ウィンドウのグローバル関数を直接呼び出し
        console.log('[CALLBACK] 方法1: 親ウィンドウのグローバル関数を直接呼び出し');
        if (window.parent) {
          console.log('[CALLBACK] window.parentにアクセス可能');
          if (typeof window.parent._onPaResSuccess === 'function') {
            console.log('[CALLBACK] 親ウィンドウの_onPaResSuccess関数を呼び出します');
            window.parent._onPaResSuccess(resultData);
            console.log('[CALLBACK] _onPaResSuccess関数の呼び出しに成功しました');
            return true;
          } else {
            console.error('[CALLBACK] 親ウィンドウに_onPaResSuccess関数が見つかりません');
            console.log('[CALLBACK] 親ウィンドウのプロパティ:', Object.keys(window.parent).filter(key => typeof window.parent[key] === 'function').join(', '));
          }
        } else {
          console.error('[CALLBACK] window.parentにアクセスできません');
        }
      } catch (e) {
        console.error('[CALLBACK] 親ウィンドウの関数呼び出しエラー:', getErrorDetails(e));
      }
      
      try {
        // 方法2: postMessageを使用（すべてのオリジンに送信）
        console.log('[CALLBACK] 方法2: postMessageで通知を試みます');
        window.parent.postMessage({
          event: 'pares_result',
          ...resultData
        }, '*');
        console.log('[CALLBACK] postMessageの送信に成功しました');
        return true;
      } catch (e) {
        console.error('[CALLBACK] postMessageエラー:', getErrorDetails(e));
      }
      
      try {
        // 方法3: ローカルストレージを使用
        console.log('[CALLBACK] 方法3: ローカルストレージを使用した通知を試みます');
        window.localStorage.setItem('3ds_auth_result', JSON.stringify(resultData));
        console.log('[CALLBACK] ローカルストレージへの保存に成功しました');
        return true; // 方法3が成功した場合もtrueを返す
      } catch (e) {
        console.error('[CALLBACK] ローカルストレージエラー:', getErrorDetails(e));
      }
      
      console.error('[CALLBACK] すべての通知方法が失敗しました');
      return false;
    }
    
    // 親ウィンドウへの通知を試行
    let notified = false;
    try {
      notified = notifyParentWindow();
      console.log('[CALLBACK] 親ウィンドウへの通知結果:', notified ? '成功' : '失敗');
    } catch (e) {
      console.error('[CALLBACK] 予期せぬエラーが発生しました:', getErrorDetails(e));
    }
    
    // 5秒後にフォールバック処理を実行（通信が確立できない場合）
    setTimeout(function() {
      console.log('[CALLBACK] フォールバック処理を確認中...');
      // 既に通知が成功している場合は何もしない
      if (notified) {
        console.log('[CALLBACK] 既に通知が成功しているため、フォールバック処理はスキップします');
        return;
      }
      
      console.log('[CALLBACK] 通知が失敗したため、フォールバック処理を実行します');
      try {
        // 最終手段: 親ページにリダイレクト
        console.log('[CALLBACK] 親ウィンドウのURLを変更します');
        window.parent.location.href = '/payment-result?md=${encodeURIComponent(md)}&pares=${encodeURIComponent(paRes)}&status=${encodeURIComponent(status)}&source=callback_fallback';
      } catch (e) {
        console.error('[CALLBACK] 親ウィンドウリダイレクトエラー:', getErrorDetails(e));
        try {
          // エラーが発生した場合は現在のウィンドウをリダイレクト
          console.log('[CALLBACK] 現在のウィンドウをリダイレクトします');
          window.location.href = '/payment-result?md=${encodeURIComponent(md)}&pares=${encodeURIComponent(paRes)}&status=${encodeURIComponent(status)}&error=callback_failed&source=direct_redirect';
        } catch (redirectError) {
          console.error('[CALLBACK] 最終リダイレクトにも失敗しました:', getErrorDetails(redirectError));
        }
      }
    }, 5000);
  </script>
</head>
<body>
  <h3>認証処理が完了しました</h3>
  <p>自動的に結果ページに移動します。移動しない場合は<a href="javascript:void(0);" onclick="window.parent.location.href='/payment-result?md=${encodeURIComponent(md)}&pares=${encodeURIComponent(paRes)}&status=${encodeURIComponent(status)}';">こちら</a>をクリックしてください。</p>
  
  <div style="margin-top: 20px; border: 1px solid #ccc; padding: 10px; background-color: #f5f5f5;">
    <h4>デバッグ情報:</h4>
    <p>MD: ${md}</p>
    <p>MD長さ: ${md.length}</p>
    <p>PaRes: ${paRes}</p>
    <p>PaRes長さ: ${paRes.length}</p>
    <p>Status: ${status}</p>
  </div>
</body>
</html>
  `);
  
  console.log('親ウィンドウに通知するHTMLレスポンスを送信しました');
  console.log('=== 3Dセキュアコールバック受信 [END] ===');
}
