import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  // TODO V1.1: echten Sell triggern (Jupiter/Helius/QuickNode etc.)
  return NextResponse.json({
    ok: true,
    id: params.id,
    message: `Position ${params.id} verkauft (stub)`
  });
}
