import React from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Download, ZoomIn, ZoomOut } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { LossDataPoint } from '../../data/trainingMonitorMockData';

interface LossCurveGraphProps {
  lossHistory: LossDataPoint[];
  isTrainingComplete?: boolean;
}

export function LossCurveGraph({ lossHistory, isTrainingComplete = false }: LossCurveGraphProps) {
  const handleExport = () => {
    // Simulate export functionality
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1200;
    
    // In a real implementation, you would render the chart to canvas and download
    console.log('Exporting loss curve chart...');
    alert('Chart export feature would download a 2000x1200px PNG here');
  };
  
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Loss Curve</h3>
          <p className="text-sm text-muted-foreground">
            Training and validation loss over time
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4 mr-2" />
            Export PNG
          </Button>
        </div>
      </div>
      
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={lossHistory}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="step"
              label={{ value: 'Training Step', position: 'insideBottom', offset: -5 }}
              stroke="#6b7280"
            />
            <YAxis
              label={{ value: 'Loss', angle: -90, position: 'insideLeft' }}
              stroke="#6b7280"
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '8px 12px',
              }}
              formatter={(value: number) => value.toFixed(4)}
            />
            <Legend
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="trainingLoss"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Training Loss"
              animationDuration={300}
            />
            <Line
              type="monotone"
              dataKey="validationLoss"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Validation Loss"
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {isTrainingComplete && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            <span className="font-semibold">Training Complete!</span> Final losses recorded.
          </p>
        </div>
      )}
      
      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <p>
          Showing {lossHistory.length} data points •{' '}
          {isTrainingComplete ? 'Final' : 'Auto-updates every 60s'}
        </p>
        <p>Hover over lines for exact values</p>
      </div>
    </Card>
  );
}
