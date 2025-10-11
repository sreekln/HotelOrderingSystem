import { MenuItem } from './mockData';

export interface PrintJobOptions {
  tableNumber: number;
  customerName: string;
  items: { item: MenuItem; quantity: number }[];
  specialInstructions?: string;
  orderTime: Date;
}

export const printKitchenOrder = (options: PrintJobOptions): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      const { tableNumber, customerName, items, specialInstructions, orderTime } = options;

      const printWindow = window.open('', '_blank', 'width=800,height=600');

      if (!printWindow) {
        throw new Error('Failed to open print window. Please check your popup blocker settings.');
      }

      const printContent = generatePrintHTML(options);

      printWindow.document.write(printContent);
      printWindow.document.close();

      printWindow.addEventListener('afterprint', () => {
        printWindow.close();
        resolve();
      });

      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (error) {
          printWindow.close();
          reject(error);
        }
      }, 250);

    } catch (error) {
      console.error('Print error:', error);
      reject(error);
    }
  });
};

const generatePrintHTML = (options: PrintJobOptions): string => {
  const { tableNumber, customerName, items, specialInstructions, orderTime } = options;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const itemsHTML = items.map((item, index) => `
    <div class="item-row">
      <div class="item-info">
        <div class="item-name">${escapeHTML(item.item.name)}</div>
        <div class="item-details">${escapeHTML(item.item.company)} • ${escapeHTML(item.item.food_category)}</div>
      </div>
      <div class="item-quantity">${item.quantity}</div>
    </div>
  `).join('');

  const instructionsHTML = specialInstructions ? `
    <div class="instructions">
      <div class="instructions-label">SPECIAL INSTRUCTIONS:</div>
      <div class="instructions-text">${escapeHTML(specialInstructions)}</div>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Kitchen Order - Table ${tableNumber}</title>
        <meta charset="UTF-8">
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Courier New', 'Courier', monospace;
            font-size: 12px;
            line-height: 1.4;
            padding: 10px;
            width: 80mm;
            background: white;
            color: black;
          }

          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }

          .header h1 {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
            letter-spacing: 1px;
          }

          .header .subtitle {
            font-size: 16px;
            font-weight: bold;
          }

          .info-section {
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px dashed #000;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 12px;
          }

          .info-row .label {
            font-weight: bold;
          }

          .items-section {
            margin-bottom: 10px;
          }

          .items-header {
            font-weight: bold;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
            margin-bottom: 5px;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
          }

          .item-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px dotted #ccc;
            align-items: flex-start;
          }

          .item-row:last-child {
            border-bottom: none;
          }

          .item-info {
            flex: 1;
            padding-right: 10px;
          }

          .item-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 3px;
            word-wrap: break-word;
          }

          .item-details {
            font-size: 11px;
            color: #333;
            margin-top: 2px;
          }

          .item-quantity {
            font-size: 18px;
            font-weight: bold;
            min-width: 35px;
            text-align: center;
            padding: 2px 5px;
            border: 2px solid #000;
            border-radius: 3px;
          }

          .instructions {
            background: #fff;
            border: 3px solid #000;
            padding: 10px;
            margin: 15px 0;
          }

          .instructions-label {
            font-size: 11px;
            font-weight: bold;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
          }

          .instructions-text {
            font-size: 14px;
            font-weight: bold;
            white-space: pre-wrap;
            word-wrap: break-word;
          }

          .footer {
            text-align: center;
            border-top: 2px dashed #000;
            padding-top: 10px;
            margin-top: 15px;
          }

          .footer .priority {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px;
            letter-spacing: 1px;
          }

          .timestamp {
            font-size: 10px;
            text-align: center;
            margin-top: 5px;
            color: #444;
          }

          @media print {
            body {
              padding: 5px;
            }

            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>KITCHEN ORDER</h1>
          <div class="subtitle">TABLE ${tableNumber}</div>
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="label">Customer:</span>
            <span>${escapeHTML(customerName)}</span>
          </div>
          <div class="info-row">
            <span class="label">Date:</span>
            <span>${formatDate(orderTime)}</span>
          </div>
          <div class="info-row">
            <span class="label">Time:</span>
            <span>${formatTime(orderTime)}</span>
          </div>
        </div>

        <div class="items-section">
          <div class="items-header">
            <span>ITEMS</span>
            <span>QTY</span>
          </div>
          ${itemsHTML}
        </div>

        ${instructionsHTML}

        <div class="footer">
          <div class="priority">★ PREPARE IMMEDIATELY ★</div>
          <div class="timestamp">
            Printed: ${formatDate(orderTime)} ${formatTime(orderTime)}
          </div>
        </div>
      </body>
    </html>
  `;
};

const escapeHTML = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

export const checkPrinterSupport = (): boolean => {
  return typeof window !== 'undefined' && typeof window.print === 'function';
};

export const detectNetworkPrinters = async (): Promise<boolean> => {
  if (!checkPrinterSupport()) {
    return false;
  }

  try {
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'notifications' as PermissionName });
      return result.state !== 'denied';
    }
    return true;
  } catch {
    return true;
  }
};
