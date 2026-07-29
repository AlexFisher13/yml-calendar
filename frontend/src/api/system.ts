export type SystemStatus = {
  application: string
  status: string
  timestamp: string
}

export async function getSystemStatus(signal?: AbortSignal): Promise<SystemStatus> {
  const response = await fetch('/api/v1/system/status', { signal })

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`)
  }

  return response.json() as Promise<SystemStatus>
}
