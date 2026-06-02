import { NextResponse } from 'next/server';

const BASE_URL = 'https://zqi6swpat4.execute-api.us-east-1.amazonaws.com/dev';
function buildBasicAuth(): string {
  const user = process.env.NEXT_PUBLIC_BASIC_AUTH_USER ?? '';
  //const pass = process.env.NEXT_PUBLIC_BASIC_AUTH_PASS ?? '';
  const pass ="fZ9#nLp8@V2cM^wXr1*JqT6$BdKsZ3yRv!Ah7NgX%Um5LjEo^CpWx8#QdFbGtHk9"
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const principalAgentId = searchParams.get('principal_agent_id');

  if (!principalAgentId) {
    return NextResponse.json(
      { error: 'Missing required query parameter: principal_agent_id' },
      { status: 400 },
    );
  }
  const targetUrl = `${BASE_URL}/xlink_agents/${principalAgentId}/?partitionKey=agent_id`;

  try {
    console.log(`[proxy-managed-agents] GET → ${targetUrl}`);
    const response = await fetch(targetUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': buildBasicAuth(),
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown');
      console.error(`[proxy-managed-agents] ${targetUrl} → ${response.status}: ${errorText}`);
      return NextResponse.json(
        { error: `External API error: ${response.status}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error(`[proxy-managed-agents] Failed to reach ${targetUrl}:`, err);
    return NextResponse.json(
      { error: 'Failed to reach external API' },
      { status: 502 },
    );
  }
}
