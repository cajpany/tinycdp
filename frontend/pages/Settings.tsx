import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { apiKeyManager } from '@/lib/api';
import { Settings as SettingsIcon, Key, CheckCircle, AlertCircle, Copy } from 'lucide-react';

export function Settings() {
  const [apiKey, setApiKey] = useState(apiKeyManager.get());
  const [tempApiKey, setTempApiKey] = useState('');
  const { toast } = useToast();

  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      apiKeyManager.set(tempApiKey.trim());
      setApiKey(tempApiKey.trim());
      setTempApiKey('');
      toast({
        title: 'Success',
        description: 'API key saved successfully',
      });
    }
  };

  const handleClearApiKey = () => {
    apiKeyManager.clear();
    setApiKey('');
    toast({
      title: 'Success',
      description: 'API key cleared',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Copied to clipboard',
    });
  };

  const isValidKey = apiKey.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure your TinyCDP console settings
        </p>
      </div>

      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="w-5 h-5 mr-2" />
            API Key Configuration
          </CardTitle>
          <CardDescription>
            Set your TinyCDP admin API key to access the backend services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Key Status */}
          <div>
            <Label>Current API Key</Label>
            <div className="flex items-center space-x-2 mt-1">
              {isValidKey ? (
                <>
                  <Badge variant="secondary" className="font-mono">
                    {apiKey.substring(0, 8)}***
                  </Badge>
                  <Badge variant="default" className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(apiKey)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <Badge variant="destructive" className="flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Not Set
                </Badge>
              )}
            </div>
          </div>

          {/* Update Key */}
          <div className="space-y-2">
            <Label htmlFor="new-api-key">Update API Key</Label>
            <div className="flex space-x-2">
              <Input
                id="new-api-key"
                type="password"
                placeholder="Enter your admin API key"
                value={tempApiKey}
                onChange={(e) => setTempApiKey(e.target.value)}
              />
              <Button onClick={handleSaveApiKey} disabled={!tempApiKey.trim()}>
                Save
              </Button>
            </div>
          </div>

          {/* Clear Key */}
          {isValidKey && (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleClearApiKey}>
                Clear API Key
              </Button>
            </div>
          )}

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>How to get an API key:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Run <code className="bg-gray-100 px-1 rounded">npx tsx scripts/create-admin-key.ts</code> in your TinyCDP backend</li>
                <li>Copy the generated admin API key</li>
                <li>Paste it in the field above and save</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Console Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2" />
            Console Information
          </CardTitle>
          <CardDescription>
            Information about this TinyCDP console instance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Version</Label>
              <p className="text-sm text-gray-600 mt-1">v1.0.0</p>
            </div>
            <div>
              <Label>Build</Label>
              <p className="text-sm text-gray-600 mt-1">Phase 7 - Web Console</p>
            </div>
            <div>
              <Label>Backend URL</Label>
              <p className="text-sm text-gray-600 mt-1 font-mono">
                http://localhost:4000
              </p>
            </div>
            <div>
              <Label>Storage</Label>
              <p className="text-sm text-gray-600 mt-1">Browser localStorage</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentation Links */}
      <Card>
        <CardHeader>
          <CardTitle>Documentation & Resources</CardTitle>
          <CardDescription>
            Helpful links and documentation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Project Documentation</div>
                <div className="text-sm text-gray-500">README.md and PROJECT_PLAN.md</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">API Reference</div>
                <div className="text-sm text-gray-500">Backend service endpoints</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">SDK Documentation</div>
                <div className="text-sm text-gray-500">TypeScript SDK usage guide</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Demo Application</div>
                <div className="text-sm text-gray-500">Example integration</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
