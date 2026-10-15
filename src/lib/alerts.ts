import Swal, { SweetAlertIcon } from 'sweetalert2';

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getLocalDatetimeString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Universal dark-themed SweetAlert2 confirmation dialog
 */
export async function confirmAction(options: {
  title: string;
  text?: string;
  icon?: SweetAlertIcon;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
}): Promise<boolean> {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon || 'warning',
    showCancelButton: true,
    confirmButtonColor: options.confirmColor || '#4f46e5',
    cancelButtonColor: '#475569',
    confirmButtonText: options.confirmText || 'হ্যাঁ, এগিয়ে যান',
    cancelButtonText: options.cancelText || 'বাতিল',
    background: '#0f172a',
    color: '#f8fafc',
    customClass: {
      popup: 'border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-xl',
      title: 'text-white text-base sm:text-lg font-bold',
      htmlContainer: 'text-slate-300 text-xs sm:text-sm',
    },
  });

  return result.isConfirmed;
}

/**
 * Universal dark-themed SweetAlert2 alert/info modal
 */
export async function showInfoAlert(options: {
  title: string;
  text: string;
  icon?: SweetAlertIcon;
  confirmText?: string;
}): Promise<void> {
  await Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon || 'info',
    confirmButtonColor: '#4f46e5',
    confirmButtonText: options.confirmText || 'ঠিক আছে',
    background: '#0f172a',
    color: '#f8fafc',
    customClass: {
      popup: 'border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-xl',
      title: 'text-white text-base sm:text-lg font-bold',
      htmlContainer: 'text-slate-300 text-xs sm:text-sm',
    },
  });
}

export interface RentPaymentInput {
  amount: number;
  paymentMethod: string;
  paymentMethodLabel: string;
  paidAt: string;
  notes: string;
}

/**
 * Interactive multi-field SweetAlert2 modal for rent collection (Step 1 of Double Popup)
 */
export async function promptRentPaymentModal(options: {
  memberName: string;
  roomRent: number;
  cycleName?: string;
}): Promise<RentPaymentInput | null> {
  const defaultDatetime = getLocalDatetimeString();
  const defaultNote = `${options.memberName} এর বাসা ভাড়া পরিশোধ - ${options.cycleName || 'চলতি মাস'}`;

  const result = await Swal.fire({
    title: '🏠 বাসা ভাড়া আদায় ও রেকর্ড',
    html: `
      <div class="space-y-3.5 text-left pt-2 font-sans">
        <div class="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-3 flex items-center justify-between">
          <div>
            <span class="text-[11px] text-slate-400 block font-medium">সদস্যের নাম</span>
            <span class="text-sm font-bold text-white">${escapeHtml(options.memberName)}</span>
          </div>
          <div class="text-right">
            <span class="text-[11px] text-slate-400 block font-medium">মাস / সাইকেল</span>
            <span class="text-xs font-semibold text-indigo-300">${escapeHtml(options.cycleName || 'চলতি মাস')}</span>
          </div>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">
            💰 বাসা ভাড়ার পরিমাণ (টাকা)
          </label>
          <input
            id="swal-rent-amount"
            type="number"
            value="${options.roomRent}"
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="টাকার পরিমাণ লিখুন"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">
            💳 পরিশোধের মাধ্যম (Payment Method)
          </label>
          <select
            id="swal-rent-method"
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="cash" selected>💵 নগদ (Cash)</option>
            <option value="bkash">📱 বিকাশ (bKash)</option>
            <option value="nagad">📱 নগদ ওয়ালেট (Nagad)</option>
            <option value="rocket">📱 রকেট (Rocket)</option>
            <option value="bank">🏦 ব্যাংক ট্রান্সফার (Bank Transfer)</option>
            <option value="other">🔄 অন্যান্য (Other)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">
            ⏰ আদায়ের সময় ও তারিখ (Payment Time)
          </label>
          <input
            id="swal-rent-datetime"
            type="datetime-local"
            value="${defaultDatetime}"
            class="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">
            📝 নোট / মন্তব্য ও ট্রানজেকশন আইডি (Note / TrxID)
          </label>
          <textarea
            id="swal-rent-notes"
            rows="2"
            class="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500 placeholder-slate-500 transition-colors"
            placeholder="যেমন: বাসা ভাড়া পরিশোধ - বিকাশ TrxID #XXXXXX"
          >${escapeHtml(defaultNote)}</textarea>
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#475569',
    confirmButtonText: 'ভাড়া আদায় নিশ্চিত করুন',
    cancelButtonText: 'বাতিল',
    background: '#0f172a',
    color: '#f8fafc',
    customClass: {
      popup: 'border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-xl max-w-md',
      title: 'text-white text-lg font-bold',
      htmlContainer: 'text-slate-300',
    },
    preConfirm: () => {
      const amountEl = document.getElementById('swal-rent-amount') as HTMLInputElement | null;
      const methodEl = document.getElementById('swal-rent-method') as HTMLSelectElement | null;
      const dateEl = document.getElementById('swal-rent-datetime') as HTMLInputElement | null;
      const notesEl = document.getElementById('swal-rent-notes') as HTMLTextAreaElement | null;

      const amount = Number(amountEl?.value);
      if (isNaN(amount) || amount <= 0) {
        Swal.showValidationMessage('অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন');
        return false;
      }
      if (!dateEl?.value) {
        Swal.showValidationMessage('অনুগ্রহ করে আদায়ের তারিখ ও সময় নির্বাচন করুন');
        return false;
      }

      const paymentMethod = methodEl?.value || 'cash';
      const methodMap: Record<string, string> = {
        cash: 'নগদ (Cash)',
        bkash: 'বিকাশ (bKash)',
        nagad: 'নগদ ওয়ালেট (Nagad)',
        rocket: 'রকেট (Rocket)',
        bank: 'ব্যাংক ট্রান্সফার (Bank Transfer)',
        other: 'অন্যান্য',
      };

      return {
        amount,
        paymentMethod,
        paymentMethodLabel: methodMap[paymentMethod] || paymentMethod,
        paidAt: dateEl.value,
        notes: (notesEl?.value || '').trim(),
      };
    },
  });

  if (!result.isConfirmed || !result.value) {
    return null;
  }

  return result.value as RentPaymentInput;
}

/**
 * Success SweetAlert2 modal displaying payment receipt (Step 2 of Double Popup)
 */
export async function showRentSuccessModal(details: {
  memberName: string;
  amount: number;
  paymentMethodLabel: string;
  paidAt: string;
  notes?: string;
}): Promise<void> {
  let formattedDate = details.paidAt;
  try {
    formattedDate = new Date(details.paidAt).toLocaleString('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    // fallback to original
  }

  await Swal.fire({
    title: 'ভাড়া আদায় সফল হয়েছে! 🎉',
    html: `
      <div class="text-left space-y-3 font-sans pt-2">
        <div class="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <span class="text-base">✅</span>
          <span>বাসা ভাড়া সফলভাবে আদায় ও মেস ফান্ডে জমা (Deposit) হিসেবে রেকর্ড হয়েছে!</span>
        </div>
        
        <div class="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 space-y-2.5 text-xs">
          <div class="flex justify-between py-1 border-b border-slate-800">
            <span class="text-slate-400">সদস্যের নাম:</span>
            <span class="font-bold text-white">${escapeHtml(details.memberName)}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-800">
            <span class="text-slate-400">আদায়কৃত ভাড়া:</span>
            <span class="font-mono font-bold text-emerald-400 text-sm">৳${Number(details.amount).toLocaleString('bn-BD')}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-800">
            <span class="text-slate-400">পরিশোধ মাধ্যম:</span>
            <span class="font-medium text-slate-200">${escapeHtml(details.paymentMethodLabel)}</span>
          </div>
          <div class="flex justify-between py-1 border-b border-slate-800">
            <span class="text-slate-400">আদায়ের সময়:</span>
            <span class="text-slate-300 font-mono">${escapeHtml(formattedDate)}</span>
          </div>
          ${
            details.notes
              ? `
          <div class="pt-1">
            <span class="text-slate-400 block mb-1">মন্তব্য ও নোট:</span>
            <p class="text-slate-200 italic bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-[11px] leading-relaxed">${escapeHtml(details.notes)}</p>
          </div>
          `
              : ''
          }
        </div>
      </div>
    `,
    icon: 'success',
    confirmButtonColor: '#10b981',
    confirmButtonText: 'ঠিক আছে (Done)',
    background: '#0f172a',
    color: '#f8fafc',
    customClass: {
      popup: 'border border-slate-700/80 rounded-3xl shadow-2xl backdrop-blur-xl max-w-md',
      title: 'text-white text-lg font-bold',
      htmlContainer: 'text-slate-300',
    },
  });
}
