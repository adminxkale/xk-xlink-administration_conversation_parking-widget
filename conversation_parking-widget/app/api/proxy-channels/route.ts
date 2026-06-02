import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Replace with actual API call
  // id must match phone_number so the interactions API receives the real number
  const mockChannels = [
    { id: '12053505800222', phone_number_id: '1205350580022', phone_number: '12053505800222', name: '1205350580022' },
  ];

  return NextResponse.json(mockChannels);
}
