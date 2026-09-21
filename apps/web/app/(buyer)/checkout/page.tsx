import { CheckoutForm } from '@/components/CheckoutForm';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
export default function CheckoutPage() {
  return <main className="mx-auto max-w-2xl px-4 py-10"><Card><CardHeader><h1 className="text-3xl font-black">Checkout</h1><p className="text-sm text-muted-foreground">Cada vendedor recibe su pago directamente mediante Mercado Pago Split.</p></CardHeader><CardContent><CheckoutForm /></CardContent></Card></main>;
}
