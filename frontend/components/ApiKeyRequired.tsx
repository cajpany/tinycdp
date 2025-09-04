import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, Settings } from 'lucide-react';

interface ApiKeyRequiredProps {
  pageName: string;
}

export function ApiKeyRequired({ pageName }: ApiKeyRequiredProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">{pageName}</h1>
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            To manage {pageName.toLowerCase()}, please configure your API key first.
          </span>
          <Button asChild variant="outline" size="sm">
            <Link to="/settings">
              <Settings className="w-4 h-4 mr-2" />
              Go to Settings
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
