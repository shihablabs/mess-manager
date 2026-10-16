import { NextResponse } from 'next/server';
import { getStore } from '@/lib/store';

export async function GET(request: Request) {
  try {
    const store = await getStore();
    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycleId') || 'cycle_1';
    const format = searchParams.get('format') || 'csv';

    const calculation = store.computeCurrentCycleBilling(cycleId);
    const cycle = store.cycles.find((c) => c._id === cycleId);

    if (format === 'json') {
      const snapshot = store.cycleSnapshots.find((s) => s.cycleId === cycleId);
      const fullBackup = {
        exportDate: new Date().toISOString(),
        mess: store.mess,
        cycle,
        snapshot: snapshot || null,
        bills: store.bills.filter((b) => b.cycleId === cycleId),
        bazars: store.bazars.filter((b) => b.cycleId === cycleId),
        meals: store.meals.filter((m) => m.cycleId === cycleId),
        deposits: store.deposits.filter((d) => d.cycleId === cycleId),
        fixedEvents: store.fixedEvents.filter((e) => e.cycleId === cycleId),
        bazarSlots: store.bazarSlots.filter((s) => s.cycleId === cycleId),
        members: store.users,
        calculation,
        auditLogs: store.auditLogs,
      };

      return new NextResponse(JSON.stringify(fullBackup, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="mess-backup-${cycleId}.json"`,
        },
      });
    }

    // Generate CSV (SRS Section 4.8)
    const headers = [
      'সদস্যের নাম',
      'মিল ইউনিট',
      'মিল খরচ (টাকা)',
      'ফিক্সড বাজার শেয়ার (টাকা)',
      'ইউটিলিটি শেয়ার (টাকা)',
      'রুম ভাড়া (টাকা)',
      'মোট দেনা (টাকা)',
      'সাধারণ জমা (টাকা)',
      'বড় বাজার জমা (টাকা)',
      'নিজস্ব বাজার খরচ (টাকা)',
      'মোট ক্রেডিট/পাওনা (টাকা)',
      'চূড়ান্ত ব্যালেন্স (টাকা)',
    ];

    const rows = calculation.allMembersSummary.map((m) => [
      `"${m.name}"`,
      m.mealUnits,
      m.regularMealCost,
      m.fixedShare,
      m.utilityShare,
      m.roomRent,
      m.totalDues,
      m.generalDeposits,
      m.bigBazarDeposits,
      m.approvedBazarSpentOwnMoney,
      m.totalCredits,
      m.netBalance,
    ]);

    // Summary line
    rows.push([
      '"মোট মেস"',
      calculation.totalMealUnits,
      calculation.mealPoolTotal,
      calculation.allMembersSummary.reduce((s, m) => s + m.fixedShare, 0),
      calculation.totalUtility,
      calculation.allMembersSummary.reduce((s, m) => s + m.roomRent, 0),
      calculation.totals.totalDues,
      calculation.allMembersSummary.reduce((s, m) => s + m.generalDeposits, 0),
      calculation.allMembersSummary.reduce((s, m) => s + m.bigBazarDeposits, 0),
      calculation.allMembersSummary.reduce((s, m) => s + m.approvedBazarSpentOwnMoney, 0),
      calculation.totals.totalCredits,
      calculation.totals.netBalance,
    ]);

    // Rounding difference row (Item ঘ & SRS)
    rows.push([
      '"রাউন্ডিং পার্থক্য (Rounding Difference)"',
      '-',
      '-',
      '-',
      '-',
      '-',
      calculation.totals.roundingDifference,
      '-',
      '-',
      '-',
      '-',
      calculation.totals.roundingDifference,
    ]);

    // Include UTF-8 BOM so Excel opens Bengali characters correctly
    const bom = '\uFEFF';
    const csvContent = bom + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="mess-statement-${cycleId}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
