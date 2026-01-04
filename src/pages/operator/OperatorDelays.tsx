import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DelayEntryForm from '@/components/operator/DelayEntryForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DelayRecord, DELAY_REASON_LABELS } from '@/types/database';
import { AlertTriangle, Calendar } from 'lucide-react';

export default function OperatorDelays() {
  const { user } = useAuth();
  const [delays, setDelays] = useState<DelayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDelays = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('delay_records')
        .select('*')
        .eq('operator_id', user.id)
        .order('delay_date', { ascending: false })
        .order('delay_start', { ascending: false })
        .limit(30);

      setDelays((data as DelayRecord[]) || []);
    } catch (error) {
      console.error('Error fetching delays:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDelays();
  }, [user]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group delays by date
  const delaysByDate = delays.reduce((acc, delay) => {
    const date = delay.delay_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(delay);
    return acc;
  }, {} as Record<string, DelayRecord[]>);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Delay Logs</h1>
          <p className="text-muted-foreground">Record and view operational delays</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <DelayEntryForm onSuccess={fetchDelays} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Delays
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
              {loading ? (
                <p className="text-muted-foreground text-center py-4">Loading...</p>
              ) : delays.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No delays recorded</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(delaysByDate).map(([date, dateDelays]) => (
                    <div key={date}>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        {formatDate(date)}
                      </p>
                      <div className="space-y-2">
                        {dateDelays.map((delay) => (
                          <div
                            key={delay.id}
                            className="p-3 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-warning" />
                                <span className="font-mono text-sm">
                                  {delay.delay_start.slice(0, 5)} - {delay.delay_end.slice(0, 5)}
                                </span>
                              </div>
                              <Badge variant="outline">{delay.duration_minutes}m</Badge>
                            </div>
                            <p className="text-sm font-medium">
                              {DELAY_REASON_LABELS[delay.reason]}
                            </p>
                            {delay.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {delay.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
