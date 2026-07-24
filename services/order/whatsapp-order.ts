import { Linking, Platform } from 'react-native';

import { formatCurrency, type Product } from '@/constants/material-data';

const APP_SIGNATURE = 'Sent from the MaterialXpress app';

type WhatsAppOrderItem = Pick<Product, 'name' | 'price' | 'unit'> & {
  quantity: number;
};

type BuildWhatsAppOrderMessageOptions = {
  address?: string;
  deliveryFee?: number;
  items: WhatsAppOrderItem[];
  paymentMode?: string;
  subtotal?: number;
  total: number;
};

type OpenWhatsAppOrderOptions = {
  message: string;
};

export type OpenWhatsAppOrderResult =
  | 'opened-app'
  | 'opened-web'
  | 'unavailable';

export function buildWhatsAppOrderMessage({
  address,
  deliveryFee,
  items,
  paymentMode,
  subtotal,
  total,
}: BuildWhatsAppOrderMessageOptions) {
  if (items.length === 0) {
    return ['Hello Material Xpress,', '', 'I would like help placing a new order.'].join('\n');
  }

  const itemLines = items.map((item, index) => {
    const lineTotal = item.price * item.quantity;

    return `${index + 1}. ${item.name} x ${item.quantity} - ${formatCurrency(lineTotal)}`;
  });

  const trimmedAddress = address?.trim();
  const trimmedPaymentMode = paymentMode?.trim();
  const messageLines = [
    'Hello Material Xpress,',
    '',
    'I would like to place the following order:',
    '',
    ...itemLines,
  ];

  if (typeof subtotal === 'number') {
    messageLines.push('', `Subtotal: ${formatCurrency(subtotal)}`);
  }

  if (typeof deliveryFee === 'number') {
    messageLines.push(`Delivery: ${deliveryFee > 0 ? formatCurrency(deliveryFee) : 'FREE'}`);
  }

  messageLines.push(`Total: ${formatCurrency(total)}`);

  if (trimmedAddress) {
    messageLines.push('', `Delivery address: ${trimmedAddress}`);
  }

  if (trimmedPaymentMode) {
    messageLines.push(`Preferred payment: ${trimmedPaymentMode}`);
  }

  messageLines.push('', APP_SIGNATURE);

  return messageLines.join('\n');
}

export async function openWhatsAppOrder({
  message,
}: OpenWhatsAppOrderOptions): Promise<OpenWhatsAppOrderResult> {
  const encodedMessage = encodeURIComponent(message);
  const nativeUrl = `whatsapp://send?phone=919718622454&text=${encodedMessage}`;
  const webUrl = `https://wa.me/919718622454?text=${encodedMessage}`;

  if (Platform.OS !== 'web') {
    try {
      await Linking.openURL(nativeUrl);
      return 'opened-app';
    } catch {
      // Fall back to the web flow when the native app is unavailable.
    }
  }

  try {
    await Linking.openURL(webUrl);
    return 'opened-web';
  } catch {
    return 'unavailable';
  }
}
