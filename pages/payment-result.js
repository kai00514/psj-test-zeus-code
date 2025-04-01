// /pages/payment-result.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function PaymentResult() {
  const router = useRouter();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    if (!router.isReady) return;

    // ここでは ?status=success/failure を表示用に受け取る
    setStatus(router.query.status || 'failure');
  }, [router.isReady, router.query]);

  const messages = {
    success: '決済が完了しました',
    failure: '決済に失敗しました',
    processing: '決済処理中...',
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '1rem' }}>
      <h2>{messages[status]}</h2>
      {status === 'failure' && (
        <button onClick={() => router.push('/credit-card')}>
          もう一度試す
        </button>
      )}
    </div>
  );
}
