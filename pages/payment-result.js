import { useRouter } from 'next/router';

export default function PaymentResult() {
  const router = useRouter();
  const { status } = router.query;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>
        {status === 'success'
          ? '決済が成功しました 🎉'
          : '決済に失敗しました 😢'}
      </h1>
      <button onClick={() => router.push('/credit-card')}>
        戻る
      </button>
    </div>
  );
}
