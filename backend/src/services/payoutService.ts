function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ProcessPaymentResult {
  success: boolean;
  transactionId: string;
  message: string;
  creditedAt: Date;
}

export async function processPayment(
  _userId: string,
  _amount: number,
  _method: string
): Promise<ProcessPaymentResult> {
  await sleep(2000);
  const txnId = `TXN${Date.now()}${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0")}`;
  const success = Math.random() > 0.05;
  return {
    success,
    transactionId: txnId,
    message: success
      ? "Payment credited successfully"
      : "Payment failed - will retry in 30 mins",
    creditedAt: new Date(),
  };
}
