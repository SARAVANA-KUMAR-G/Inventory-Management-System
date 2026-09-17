import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  QrCode,
  Printer,
  FileText,
  User,
  Tag,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import apiClient from '../services/api/client';
import { Card, Badge, Modal } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';

export function POSPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Order State
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [discountType, setDiscountType] = useState('PERCENTAGE'); // 'PERCENTAGE' or 'FIXED'
  const [discountValue, setDiscountValue] = useState(0);
  const [heldOrders, setHeldOrders] = useState([]);

  // Payment State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashTendered, setCashTendered] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Completed Invoice State
  const [completedSale, setCompletedSale] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const searchInputRef = useRef(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, catRes] = await Promise.all([
          apiClient.get('/products?pageSize=100&includeInactive=false'),
          apiClient.get('/categories')
        ]);
        if (prodRes.success) setProducts(prodRes.data);
        if (catRes.success) setCategories(catRes.data);
      } catch (err) {
        console.error('POS failed to load data', err);
      }
    }
    loadData();

    // Focus search on mount
    searchInputRef.current?.focus();
  }, []);

  // Keyboard shortcuts (F2 to focus search, F9 to checkout, Esc to clear)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F9' && cart.length > 0 && !showPaymentModal && !showReceiptModal) {
        e.preventDefault();
        setShowPaymentModal(true);
      } else if (e.key === 'Escape') {
        if (showPaymentModal) setShowPaymentModal(false);
        if (showReceiptModal) setShowReceiptModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPaymentModal, showReceiptModal]);

  // Cart operations
  const addToCart = (product) => {
    if (product.currentStock <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          alert(`Cannot add more than available stock (${product.currentStock})`);
          return prev;
        }
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: Number(product.sellingPrice),
          stock: Number(product.currentStock),
          quantity: 1,
          unit: product.unit
        }
      ];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.stock) {
              alert(`Maximum available stock is ${item.stock}`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
  };

  // Hold and Recall Order
  const holdCurrentOrder = () => {
    if (cart.length === 0) return;
    const orderToHold = {
      id: Date.now(),
      cart,
      customer: selectedCustomer,
      discountType,
      discountValue,
      heldAt: new Date().toLocaleTimeString()
    };
    setHeldOrders(prev => [...prev, orderToHold]);
    clearCart();
  };

  const recallOrder = (heldOrder) => {
    setCart(heldOrder.cart);
    setSelectedCustomer(heldOrder.customer);
    setDiscountType(heldOrder.discountType);
    setDiscountValue(heldOrder.discountValue);
    setHeldOrders(prev => prev.filter(o => o.id !== heldOrder.id));
  };

  // Calculated totals
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  let discountAmount = 0;
  if (discountValue > 0) {
    discountAmount = discountType === 'PERCENTAGE'
      ? (subtotal * Number(discountValue)) / 100
      : Number(discountValue);
  }
  discountAmount = Math.min(discountAmount, subtotal);

  const taxRate = 8.5; // default 8.5%
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxable * taxRate) / 100;
  const grandTotal = Math.round((taxable + taxAmount) * 100) / 100;

  const changeDue = Math.max(0, (Number(cashTendered) || 0) - grandTotal);

  // Complete Sale
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const payload = {
        customerName: selectedCustomer || 'Walk-in Customer',
        paymentMethod,
        discount: discountAmount,
        tax: taxAmount,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price
        }))
      };

      const res = await apiClient.post('/sales', payload);
      if (res.success && res.data) {
        setCompletedSale(res.data);
        setShowPaymentModal(false);
        setShowReceiptModal(true);
        clearCart();

        // Refresh product stock list locally
        const refreshed = await apiClient.get('/products?pageSize=100&includeInactive=false');
        if (refreshed.success) setProducts(refreshed.data);
      }
    } catch (err) {
      alert(err.message || 'Sale failed to complete');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products by category and search
  const filteredProducts = products.filter(p => {
    const matchesCat = !selectedCategory || p.categoryId === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesQuery = !searchQuery ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-6.5rem)]">
      {/* LEFT: Product Catalog & Fast Search */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Search & Category Filter Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search product by name, SKU or Barcode... (Press F2 to focus)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((p) => {
            const outOfStock = p.currentStock <= 0;
            const inCart = cart.find(i => i.productId === p.id);

            return (
              <div
                key={p.id}
                onClick={() => !outOfStock && addToCart(p)}
                className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all select-none ${
                  outOfStock
                    ? 'bg-slate-50/60 border-slate-200 opacity-60 cursor-not-allowed'
                    : inCart
                    ? 'bg-emerald-50/40 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs cursor-pointer hover:border-emerald-400'
                    : 'bg-white border-slate-200/80 hover:border-emerald-400 hover:shadow-sm cursor-pointer'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider truncate">
                      {p.categoryName || 'General'}
                    </span>
                    <Badge variant={outOfStock ? 'danger' : p.isLowStock ? 'warning' : 'success'}>
                      {p.currentStock} {p.unit}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight mb-1">
                    {p.name}
                  </h4>
                  <p className="text-[11px] text-slate-600 font-mono font-semibold">{p.sku}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900">
                    ${Number(p.sellingPrice).toFixed(2)}
                  </span>
                  {inCart ? (
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 hover:underline">
                      + Add
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: POS Register Cart & Checkout Pane */}
      <div className="w-full lg:w-96 xl:w-[420px] flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden shrink-0">
        {/* Customer & Hold Header */}
        <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-base text-slate-900">Current Order</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {heldOrders.length > 0 && (
                <div className="relative group">
                  <Button variant="secondary" size="sm" className="px-2 font-semibold">
                    <PlayCircle className="w-4 h-4 text-amber-600" />
                    Recall ({heldOrders.length})
                  </Button>
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg hidden group-hover:block p-2 z-30">
                    {heldOrders.map((ho) => (
                      <div
                        key={ho.id}
                        onClick={() => recallOrder(ho)}
                        className="p-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer flex justify-between"
                      >
                        <span>{ho.cart.length} items</span>
                        <span className="text-slate-600 font-medium">{ho.heldAt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={holdCurrentOrder}
                disabled={cart.length === 0}
                title="Hold current order"
                className="font-semibold"
              >
                <PauseCircle className="w-4 h-4" />
                Hold
              </Button>
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                title="Clear Cart"
                className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 disabled:opacity-40"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-600 shrink-0" />
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full text-xs font-semibold text-slate-900 py-1.5 px-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Walk-in Customer</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs text-center p-4">
              <ShoppingCart className="w-10 h-10 text-slate-400 mb-2 stroke-1" />
              <p className="font-bold text-slate-800">Cart is empty</p>
              <p className="text-[11px] text-slate-600 font-medium mt-0.5">Click or scan products to add them to this order</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="py-2.5 px-3 flex items-center justify-between hover:bg-slate-50/50 rounded-lg">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                  <span className="text-[11px] text-slate-700 font-semibold">${item.price.toFixed(2)} / {item.unit}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="p-1 text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center font-bold text-xs text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      className="p-1 text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-xs font-bold text-slate-900 w-16 text-right font-mono">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>

                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary & Checkout Section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
          {/* Order Level Discount */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-700 flex items-center gap-1 font-bold">
              <Tag className="w-3.5 h-3.5" /> Discount
            </span>
            <div className="flex items-center gap-1">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="py-1 px-1.5 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none"
              >
                <option value="PERCENTAGE">%</option>
                <option value="FIXED">$</option>
              </select>
              <input
                type="number"
                min="0"
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0"
                className="w-16 py-1 px-2 text-xs font-semibold text-slate-900 text-right bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Breakdown */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-700 font-semibold">
              <span>Subtotal</span>
              <span className="font-mono font-bold text-slate-900">${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Discount</span>
                <span className="font-mono">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-700 font-semibold">
              <span>Tax ({taxRate}%)</span>
              <span className="font-mono font-bold text-slate-900">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total</span>
              <span className="text-emerald-700 font-mono">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <Button
            onClick={() => setShowPaymentModal(true)}
            disabled={cart.length === 0}
            className="w-full py-3 text-base font-bold shadow-md"
          >
            Checkout (F9)
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* MODAL 1: Payment & Tender Details */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Complete Payment & Sale"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-center">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Amount Due</span>
            <h2 className="text-3xl font-black text-emerald-900 mt-1">${grandTotal.toFixed(2)}</h2>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 block mb-2">Select Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 font-bold text-xs transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-5 h-5" />
                Cash
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 font-bold text-xs transition-all ${
                  paymentMethod === 'CARD'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                Card POS
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 font-bold text-xs transition-all ${
                  paymentMethod === 'UPI'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                    : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-5 h-5" />
                UPI / QR
              </button>
            </div>
          </div>

          {paymentMethod === 'CASH' && (
            <div className="space-y-3 pt-2">
              <Input
                label="Cash Tendered ($)"
                type="number"
                step="0.01"
                placeholder={grandTotal.toFixed(2)}
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                autoFocus
              />
              <div className="flex justify-between p-3 bg-slate-100 rounded-xl text-sm font-semibold border border-slate-200">
                <span className="text-slate-800 font-bold">Change to Return:</span>
                <span className="text-slate-950 font-black font-mono text-base">${changeDue.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={() => setShowPaymentModal(false)}
              className="flex-1 font-semibold"
            >
              Cancel
            </Button>
            <Button
              loading={isSubmitting}
              onClick={handleCompleteSale}
              className="flex-1 font-bold"
            >
              Complete Sale
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: Receipt & Printable Invoice */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Sale Completed Successfully"
        maxWidth="max-w-lg"
      >
        {completedSale && (
          <div className="space-y-5">
            {/* Printable Area */}
            <div id="printable-receipt" className="p-6 bg-slate-50 rounded-2xl border border-slate-300 font-mono text-xs space-y-3">
              <div className="text-center space-y-1">
                <h3 className="font-bold text-base text-slate-950 font-sans">Smart Retail & Inventory</h3>
                <p className="text-[11px] text-slate-700 font-medium">123 Business Avenue, Suite 100, Metro City</p>
                <p className="text-[11px] text-slate-700 font-medium">Tax ID: TAX-98765432 | Phone: +1 555-0199</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-400 py-2 space-y-1 text-slate-900 font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-700">INVOICE #:</span>
                  <span className="font-bold text-slate-950">{completedSale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">DATE:</span>
                  <span>{new Date(completedSale.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">CASHIER:</span>
                  <span>{completedSale.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-700">CUSTOMER:</span>
                  <span>{completedSale.customer?.name || 'Walk-in Customer'}</span>
                </div>
              </div>

              <div className="divide-y divide-dashed divide-slate-300">
                {completedSale.items.map((it) => (
                  <div key={it.id} className="py-1.5 flex justify-between text-slate-900">
                    <div>
                      <p className="font-bold text-slate-950">{it.productName}</p>
                      <span className="text-[10px] text-slate-700 font-semibold">{it.quantity} x ${it.unitPrice.toFixed(2)}</span>
                    </div>
                    <span className="font-bold">${it.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-400 pt-2 space-y-1 text-slate-900 font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-700">SUBTOTAL:</span>
                  <span>${completedSale.subtotal.toFixed(2)}</span>
                </div>
                {completedSale.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>DISCOUNT:</span>
                    <span>-${completedSale.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-700">TAX:</span>
                  <span>${completedSale.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-950 pt-1 border-t border-slate-300">
                  <span>TOTAL:</span>
                  <span>${completedSale.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-700">PAYMENT METHOD:</span>
                  <span className="font-bold">{completedSale.paymentMethod}</span>
                </div>
              </div>

              <p className="text-center text-[10px] text-slate-700 font-medium pt-2 border-t border-slate-300">
                Thank you for your business! Please keep receipt for returns.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => window.print()}
                className="flex-1"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>

              <Button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1"
              >
                Next Sale
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

