import { NextResponse } from 'next/server';

const BASE_URL = 'https://api.xlinkapp.cloud/management-multitenant/external/management-tables';

function buildBasicAuth(): string {
  const user = process.env.AUTH_USER ?? '';
  const pass = process.env.AUTH_PASS ?? '';
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const principalAgentId = searchParams.get('principal_agent_id');
  const tenant = searchParams.get('tenant');

  if (!principalAgentId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: principal_agent_id' },
      { status: 400 },
    );
  }

  if (!tenant) {
    return NextResponse.json(
      { error: 'Missing required query parameter: tenant' },
      { status: 400 },
    );
  }

  const stage = process.env.STAGE ?? '';
  const tableName = `xlink-${stage}-agent-genesys`;
  const targetUrl = `${BASE_URL}/${tableName}/${tenant}/${principalAgentId}?sortKeyName=agent_id`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': buildBasicAuth(),
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `External API error: ${response.status}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Failed to reach external API' },
      { status: 502 },
    );
  }
}
