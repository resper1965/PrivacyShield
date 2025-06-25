/**
 * N8N Integration Service
 * Handles webhook calls to n8n workflows
 */

interface N8nWebhookResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Trigger n8n incident workflow
 * @param fileId - The file ID to process in n8n
 */
export async function triggerN8nIncident(fileId: string): Promise<N8nWebhookResponse> {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.warn('[N8N Service] N8N_WEBHOOK_URL not configured, skipping webhook call');
      return { 
        success: false, 
        error: 'N8N_WEBHOOK_URL environment variable not set' 
      };
    }

    console.log(`[N8N Service] Triggering incident workflow for fileId: ${fileId}`);
    console.log(`[N8N Service] Webhook URL: ${webhookUrl}`);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'N.Crisis-PII-Detector/1.0'
      },
      body: JSON.stringify({ fileId }),
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000) // 30 seconds
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`[N8N Service] Webhook call failed: ${response.status} - ${errorText}`);
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${errorText}` 
      };
    }

    const result = await response.json().catch(() => ({}));
    console.log(`[N8N Service] Webhook call successful for fileId: ${fileId}`);
    
    return { 
      success: true, 
      message: `Incident workflow triggered successfully for file ${fileId}` 
    };

  } catch (error) {
    console.error('[N8N Service] Error triggering n8n incident workflow:', error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    };
  }
}

/**
 * Test n8n connectivity
 */
export async function testN8nConnection(): Promise<N8nWebhookResponse> {
  try {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return { 
        success: false, 
        error: 'N8N_WEBHOOK_URL not configured' 
      };
    }

    // Send test payload
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'N.Crisis-PII-Detector/1.0'
      },
      body: JSON.stringify({ 
        fileId: 'test-connection',
        test: true 
      }),
      signal: AbortSignal.timeout(10000) // 10 seconds for test
    });

    return { 
      success: response.ok,
      message: response.ok ? 'N8N connection successful' : `HTTP ${response.status}`
    };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Connection test failed' 
    };
  }
}