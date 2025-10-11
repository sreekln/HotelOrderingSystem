import React, { useRef, useState } from 'react';
import { X, Printer } from 'lucide-react';
import { MenuItem } from '../lib/mockData';
import { format } from 'date-fns';
import { printKitchenOrder } from '../lib/printer';
import toast from 'react-hot-toast';

interface PrintPreviewProps {
  tableNumber: number;
  customerName: string;
  items: { item: MenuItem; quantity: number }[];
  specialInstructions?: string;
  onClose: () => void;
  onPrint: () => void;
}

const PrintPreview: React.FC<PrintPreviewProps> = ({
  tableNumber,
  customerName,
  items,
  specialInstructions,
  onClose,
  onPrint,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);

    try {
      await printKitchenOrder({
        tableNumber,
        customerName,
        items,
        specialInstructions,
        orderTime: new Date(),
      });

      onPrint();
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print order. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <Printer className="h-6 w-6 mr-2 text-amber-600" />
            Print Preview - Kitchen Order
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 max-w-[80mm] mx-auto">
            <div ref={printRef} className="p-4 font-mono text-sm">
              <div className="text-center border-b-2 border-dashed border-gray-800 pb-3 mb-3">
                <h1 className="text-xl font-bold mb-1">KITCHEN ORDER</h1>
                <div className="text-base font-bold">Table {tableNumber}</div>
              </div>

              <div className="mb-3 pb-3 border-b border-dashed border-gray-800">
                <div className="flex justify-between mb-1">
                  <span className="font-bold">Customer:</span>
                  <span>{customerName}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="font-bold">Date:</span>
                  <span>{format(new Date(), 'dd/MM/yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Time:</span>
                  <span>{format(new Date(), 'HH:mm:ss')}</span>
                </div>
              </div>

              <div className="mb-3">
                <div className="font-bold border-b border-gray-800 pb-1 mb-2 flex justify-between">
                  <span>ITEMS</span>
                  <span>QTY</span>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="mb-3 pb-3 border-b border-dotted border-gray-300">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-2">
                        <div className="font-bold text-sm mb-1">{item.item.name}</div>
                        <div className="text-xs text-gray-600">
                          {item.item.company} • {item.item.food_category}
                        </div>
                      </div>
                      <div className="text-xl font-bold min-w-[30px] text-center">
                        {item.quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {specialInstructions && (
                <div className="bg-yellow-50 border-2 border-yellow-600 p-2 mb-3">
                  <div className="text-xs font-bold mb-1">SPECIAL INSTRUCTIONS:</div>
                  <div className="text-sm font-bold whitespace-pre-wrap">{specialInstructions}</div>
                </div>
              )}

              <div className="text-center border-t-2 border-dashed border-gray-800 pt-3 mt-3">
                <div className="font-bold mb-1">PREPARE IMMEDIATELY</div>
                <div className="text-xs text-gray-600">
                  Printed: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isPrinting}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="px-6 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors flex items-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPrinting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Printing...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Print to Kitchen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintPreview;
