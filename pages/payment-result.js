// /pages/payment-result.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function PaymentResult() {
  const router = useRouter();
  const [status, setStatus] = useState('processing');
  const [resultData, setResultData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    console.log('=== 決済結果ページロード [詳細] ===');
    console.log('URL パラメータ詳細:', router.query);
    console.log('現在のURL:', window.location.href);
    console.log('リファラ:', document.referrer);
    console.log('タイムスタンプ:', new Date().toISOString());

    if (router.isReady) {
      const { result, status: queryStatus, message, code, paResValue } = router.query;

      if (result) {
        try {
          const parsedResult = JSON.parse(result);
          setResultData(parsedResult);
          // APIからの結果に基づいてstatusを設定
          if (parsedResult.status === 'success') {
            setStatus('success');
          } else {
            setStatus('failure');
            setErrorMessage(parsedResult.message || '決済処理に失敗しました。');
          }
        } catch (e) {
          console.error("結果データのパースエラー:", e);
          setStatus('error');
          setErrorMessage('結果データの処理中にエラーが発生しました。');
        }
      } else if (queryStatus) {
        // 3DS認証失敗など、API結果以外のステータス
        setStatus(queryStatus);
        setErrorMessage(message || '処理中に問題が発生しました。');
        // 必要に応じて追加情報を表示
        if (code) console.log("エラーコード:", code);
        if (paResValue) console.log("PaRes値:", paResValue);
      } else {
        setStatus('error');
        setErrorMessage('決済結果を取得できませんでした。');
      }
    }
  }, [router.isReady, router.query]);

  // 状態に応じたメッセージとスタイル
  const messages = {
    success: '決済が完了しました',
    failure: '決済に失敗しました',
    error: 'エラーが発生しました',
    processing: '処理中...',
  };
  
  const statusStyles = {
    success: { color: 'green', borderColor: 'green' },
    failure: { color: '#d32f2f', borderColor: '#d32f2f' },
    error: { color: '#d32f2f', borderColor: '#d32f2f' },
    processing: { color: '#1976d2', borderColor: '#1976d2' }
  };

  return (
    <>
      <Head>
        <title>決済結果 | クレジットカード決済</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      
      <div style={{ maxWidth: '500px', margin: '2rem auto', padding: '1.5rem', boxShadow: '0 0 10px rgba(0,0,0,0.1)', borderRadius: '8px' }}>
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '1.5rem', 
          padding: '1rem',
          border: `2px solid ${statusStyles[status]?.borderColor || '#ccc'}`,
          borderRadius: '4px'
        }}>
          <h2 style={{ 
            color: statusStyles[status]?.color || 'black',
            margin: '0'
          }}>
            {messages[status] || '処理結果'}
          </h2>
        </div>
        
        {resultData && status === 'success' && (
          <div style={{ marginTop: '1.5rem', backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '4px' }}>
            <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginTop: 0 }}>決済情報</h3>
            <p><strong>注文番号:</strong> {resultData.orderNumber || 'N/A'}</p>
            {resultData.amount && <p><strong>金額:</strong> {resultData.amount}円</p>}
            
            {resultData.cardInfo && (
              <div style={{ marginTop: '0.5rem' }}>
                <p><strong>カード情報:</strong> {resultData.cardInfo.prefix || ''}••••••{resultData.cardInfo.suffix || ''}</p>
                {resultData.cardInfo.expires && (
                  <p><strong>有効期限:</strong> {resultData.cardInfo.expires.month || ''}/{resultData.cardInfo.expires.year || ''}</p>
                )}
              </div>
            )}
            
            {resultData.amData && (
              <div style={{ marginTop: '0.5rem' }}>
                <p><strong>承認番号:</strong> {resultData.amData.syonin || '-'}</p>
                <p><strong>決済日時:</strong> {new Date().toLocaleString('ja-JP')}</p>
              </div>
            )}
          </div>
        )}
        
        <div style={{ marginTop: '2rem' }}>
          {status === 'failure' && (
            <button 
              onClick={() => router.push('/credit-card')}
              style={{ 
                marginBottom: '1rem', 
                padding: '0.75rem 1rem', 
                width: '100%', 
                backgroundColor: '#1976d2', 
                color: 'white', 
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              もう一度試す
            </button>
          )}
          
          <button 
            onClick={() => router.push('/')}
            style={{ 
              padding: '0.75rem 1rem', 
              width: '100%', 
              backgroundColor: status === 'success' ? '#4CAF50' : '#757575',
              color: 'white', 
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            トップページに戻る
          </button>
        </div>
        
        {/* デバッグ情報（開発時のみ表示） */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginTop: '2rem', fontSize: '12px', backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '4px' }}>
            <details>
              <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>デバッグ情報</summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {JSON.stringify(resultData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </>
  );
}
