// /pages/payment-result.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function PaymentResult() {
  const router = useRouter();
  const [status, setStatus] = useState('processing');
  const [orderInfo, setOrderInfo] = useState(null);
  const [isProcessed, setIsProcessed] = useState(false);

  useEffect(() => {
    console.log('=== 決済結果ページロード ===');
    console.log('URL パラメータ:', router.query);
    console.log('現在のURL:', window.location.href);

    if (!router.isReady) return;
    if (isProcessed) return;

    // URL パラメータから状態を設定
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

  // 状態に応じたメッセージ
  const messages = {
    success: '決済が完了しました',
    failure: '決済に失敗しました',
    processing: '処理中...',
  };

  return (
    <>
      <Head>
        <title>決済結果 | クレジットカード決済</title>
      </Head>
      
      <div style={{ maxWidth: '400px', margin: '2rem auto', padding: '1rem', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
        <h2>{messages[status] || '処理結果'}</h2>
        
        {orderInfo && status === 'success' && (
          <div style={{ marginTop: '1rem' }}>
            <p>注文番号: {orderInfo.orderNumber}</p>
            {orderInfo.amount && <p>金額: {orderInfo.amount}円</p>}
          </div>
        )}
        
        <div style={{ marginTop: '2rem' }}>
          {status === 'failure' && (
            <button 
              onClick={() => router.push('/credit-card')}
              style={{ marginBottom: '1rem', padding: '0.5rem 1rem', width: '100%' }}
            >
              もう一度試す
            </button>
          )}
          
          <button 
            onClick={() => router.push('/')}
            style={{ padding: '0.5rem 1rem', width: '100%' }}
          >
            トップページに戻る
          </button>
        </div>
      </div>
    </>
  );
}
