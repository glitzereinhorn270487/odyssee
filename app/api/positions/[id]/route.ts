import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const url = new URL(req.url);
  const timeWindow = url.searchParams.get('timeWindow') || '24h';

  const details = {
    id: params.id,
    timeWindow,
    chartData: [
      { time: '00:00', price: 1.1 },
      { time: '06:00', price: 1.2 },
      { time: '12:00', price: 1.15 },
      { time: '18:00', price: 1.25 }
    ]
  };

  return NextResponse.json(details);
}

