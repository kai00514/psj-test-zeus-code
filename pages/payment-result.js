// /pages/payment-result.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function PaymentResult() {
  const router = useRouter();
  const [status, setStatus] = useState('processing');
  const [orderInfo, setOrderInfo] = useState(null);
  const [isProcessed, setIsProcessed] = useState(false);
  const [debug, setDebug] = useState({});

  useEffect(() => {
    console.log('=== 決済結果ページロード [詳細] ===');
    console.log('URL パラメータ詳細:', router.query);
    console.log('現在のURL:', window.location.href);
    console.log('リファラ:', document.referrer);
    console.log('タイムスタンプ:', new Date().toISOString());

    // デバッグ情報を収集
    const debugInfo = {
      url: window.location.href,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      query: router.query,
      userAgent: navigator.userAgent
    };
    setDebug(debugInfo);

    if (!router.isReady) return;
    if (isProcessed) return;

    // 3Dセキュア認証結果の処理（コールバックから直接遷移した場合）
    if (router.query.md || router.query.MD) {
      console.log('認証結果パラメータを検出:', {
        md: router.query.md || router.query.MD,
        paRes: router.query.pares || router.query.PaRes || 'なし',
        source: router.query.source || '直接'
      });
      
      // まだ決済処理が完了していない場合は、AuthReq/PayReqを実行
      // 通常このルートは、認証後のコールバックでフロントエンド処理が失敗した場合のフォールバック
      processAuthResult(router.query.md || router.query.MD, router.query.pares || router.query.PaRes || 'Y');
      return;
    }

    // 決済結果の処理
    if (router.query.result) {
      try {
        const resultData = JSON.parse(router.query.result);
        console.log('決済結果データを検出:', resultData);
        
        if (resultData.status === 'success') {
          setStatus('success');
          setOrderInfo({
            orderNumber: resultData.orderNumber || '',
            amount: router.query.amount || '',
            cardInfo: resultData.cardInfo || {},
            amData: resultData.amData || {}
          });
        } else {
          setStatus('failure');
        }
        
        setIsProcessed(true);
      } catch (e) {
        console.error('決済結果データの解析エラー:', e);
        setStatus('failure');
        setIsProcessed(true);
      }
      return;
    }

    // 単純なステータスパラメータの処理
    if (router.query.status) {
      console.log('Status found in URL:', router.query.status);
      setStatus(router.query.status);
      
      if (router.query.orderNumber) {
        setOrderInfo({
          orderNumber: router.query.orderNumber,
          amount: router.query.amount
        });
      }
      
      setIsProcessed(true);
    } else {
      console.log('No status in URL, setting default failure');
      setStatus('failure');
      setIsProcessed(true);
    }
  }, [router.isReady, router.query, isProcessed]);

  // 認証結果を処理する関数
  const processAuthResult = async (md, paRes) => {
    console.log('コールバックから受け取った認証結果を処理:', { md, paRes });
    
    try {
      // まずAuthReqを実行
      console.log('AuthReq APIを呼び出します');
      const authResponse = await fetch('/api/payment-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          xid: md,
          paRes: paRes || 'Y'
        }),
      });
      
      if (!authResponse.ok) {
        throw new Error(`認証API呼び出しエラー: ${authResponse.status}`);
      }
      
      const authResult = await authResponse.json();
      console.log('AuthRes結果:', authResult);
      
      if (authResult.status !== 'success') {
        throw new Error(`認証失敗: ${authResult.message || 'エラーが発生しました'}`);
      }
      
      // 認証成功の場合、PayReqを実行
      console.log('PayReq APIを呼び出します');
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
        throw new Error(`決済API呼び出しエラー: ${payResponse.status}`);
      }
      
      const payResult = await payResponse.json();
      console.log('PayRes結果:', payResult);
      
      // 結果を表示
      if (payResult.status === 'success') {
        setStatus('success');
        setOrderInfo({
          orderNumber: payResult.orderNumber || '',
          cardInfo: payResult.cardInfo || {},
          amData: payResult.amData || {}
        });
      } else {
        setStatus('failure');
      }
      
      setIsProcessed(true);
      
    } catch (error) {
      console.error('認証/決済処理エラー:', error);
      setStatus('failure');
      setIsProcessed(true);
    }
  };

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
        
        {orderInfo && status === 'success' && (
          <div style={{ marginTop: '1.5rem', backgroundColor: '#f9f9f9', padding: '1rem', borderRadius: '4px' }}>
            <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginTop: 0 }}>決済情報</h3>
            <p><strong>注文番号:</strong> {orderInfo.orderNumber}</p>
            {orderInfo.amount && <p><strong>金額:</strong> {orderInfo.amount}円</p>}
            
            {orderInfo.cardInfo && (
              <div style={{ marginTop: '0.5rem' }}>
                <p><strong>カード情報:</strong> {orderInfo.cardInfo.prefix || ''}••••••{orderInfo.cardInfo.suffix || ''}</p>
                {orderInfo.cardInfo.expires && (
                  <p><strong>有効期限:</strong> {orderInfo.cardInfo.expires.month || ''}/{orderInfo.cardInfo.expires.year || ''}</p>
                )}
              </div>
            )}
            
            {orderInfo.amData && (
              <div style={{ marginTop: '0.5rem' }}>
                <p><strong>承認番号:</strong> {orderInfo.amData.syonin || '-'}</p>
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
                {JSON.stringify(debug, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </>
  );
}
