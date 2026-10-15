import { getDb } from "@/lib/db";
import { getStore } from "@/lib/store";
import { DepositDoc } from "@/models/types";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const store = await getStore();
  const { searchParams } = new URL(request.url);
  const cycleId =
    searchParams.get("cycleId") ||
    (store.cycles[0]?._id as string) ||
    "cycle_1";
  const userId = searchParams.get("userId");

  let list = store.deposits.filter((d) => d.cycleId === cycleId);
  if (userId) list = list.filter((d) => d.userId === userId);

  const enriched = list.map((d) => {
    if (d.userId === "mess_fund") {
      return {
        ...d,
        userName: "🏦 মেস সাধারণ তহবিল (সরাসরি পরিশোধ)",
      };
    }
    const user = store.users.find((u) => u._id === d.userId);
    return {
      ...d,
      userName: user ? user.name : "সদস্য",
    };
  });

  return NextResponse.json({ success: true, deposits: enriched });
}

export async function POST(request: Request) {
  try {
    const store = await getStore();
    const db = await getDb();
    const body = await request.json();
    const {
      userId,
      cycleId = (store.cycles[0]?._id as string) || "cycle_1",
      amount,
      type = "general",
      notes,
      adminUserId,
    } = body;

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "সদস্য ও সঠিক টাকার পরিমাণ আবশ্যক" },
        { status: 400 },
      );
    }

    const newDeposit: DepositDoc = {
      _id: `dep_${Date.now()}`,
      userId,
      cycleId,
      messId: store.mess._id as string,
      amount: Number(amount),
      date: new Date().toISOString().split("T")[0],
      type,
      isPaid: true,
      notes,
      createdAt: new Date(),
    };

    if (db) {
      await db.collection("deposits").insertOne(newDeposit as any);
    }

    return NextResponse.json({ success: true, deposit: newDeposit });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
