import { formatMoney } from '@/lib/utils/format'
import type { OrderItemOut } from '@/lib/api/types'

export function OrderItems({ items }: { items: OrderItemOut[] }) {
  return (
    <div className="border-border bg-surface shadow-card overflow-hidden rounded-2xl border">
      <table className="w-full text-sm">
        <thead className="bg-background text-muted text-left text-xs uppercase tracking-wide">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-semibold">
              Item
            </th>
            <th scope="col" className="hidden px-4 py-2.5 text-right font-semibold sm:table-cell">
              Price
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">
              Qty
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={`${it.product_id ?? 'item'}-${i}`} className="border-border border-t">
              <td className="px-4 py-3">
                <span className="text-content font-medium">{it.product_name}</span>
                <span className="text-muted block text-xs">{it.product_unit}</span>
              </td>
              <td className="border-border text-muted px-4 py-3 text-right align-top sm:table-cell sm:border-l">
                {formatMoney(it.unit_price)}
              </td>
              <td className="px-4 py-3 text-right align-top tabular-nums">{it.quantity}</td>
              <td className="px-4 py-3 text-right align-top font-semibold">
                {formatMoney(it.line_total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function OrderTotals({
  subtotal,
  deliveryFee,
  total,
}: {
  subtotal: string
  deliveryFee: string
  total: string
}) {
  return (
    <div className="border-border bg-surface shadow-card space-y-2 rounded-2xl border p-5 text-sm">
      <div className="flex justify-between">
        <span className="text-muted">Subtotal</span>
        <span className="text-content">{formatMoney(subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted">Delivery</span>
        <span className="text-content">
          {Number(deliveryFee) === 0 ? 'Free' : formatMoney(deliveryFee)}
        </span>
      </div>
      <div className="border-border flex justify-between border-t pt-2">
        <span className="text-content font-semibold">Total</span>
        <span className="text-content text-lg font-bold">{formatMoney(total)}</span>
      </div>
    </div>
  )
}
