import Swal, { SweetAlertIcon } from 'sweetalert2';

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
