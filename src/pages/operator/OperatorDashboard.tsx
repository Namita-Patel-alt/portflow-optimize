import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LiftEntryForm from '@/components/operator/LiftEntryForm';
import DelayEntryForm from '@/components/operator/DelayEntryForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LiftLog, DelayRecord, TARGET_LIFTS_PER_HOUR, DELAY_REASON_LABELS } from '@/types/database';
import { Container, Target, AlertTriangle, TrendingUp, Clock } from 'lucide-react';

export default function OperatorDashboard() {
  const { user, profile } = useAuth();
  const [todayLifts, setTodayLifts] = useState<LiftLog[]>([]);
  const [todayDelays, setTodayDelays] = useState<DelayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchTodayData = async () => {
    if (!user) return;

    try {
      // Fetch today's lift logs
      const { data: lifts } = await supabase
        .from('lift_logs')
        .select('*')
        .eq('operator_id', user.id)
        .eq('log_date', today)
        .order('hour_slot', { ascending: true });

      setTodayLifts((lifts as LiftLog[]) || []);

      // Fetch today's delays
      const { data: delays } = await supabase
        .from('delay_records')
        .select('*')
        .eq('operator_id', user.id)
        .eq('delay_date', today)
        .order('delay_start', { ascending: true });

      setTodayDelays((delays as DelayRecord[]) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();

    // Set up realtime subscription for lift logs
    const liftChannel = supabase
      .channel('operator-lifts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lift_logs',
          filter: `operator_id=eq.${user?.id}`,
        },
        () => fetchTodayData()
      )
      .subscribe();

    // Set up realtime subscription for delays
    const delayChannel = supabase
      .channel('operator-delays')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'delay_records',
          filter: `operator_id=eq.${user?.id}`,
        },
        () => fetchTodayData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(liftChannel);
      supabase.removeChannel(delayChannel);
    };
  }, [user]);

  // Calculate stats
  const totalLifts = todayLifts.reduce((sum, log) => sum + log.lifts_count, 0);
  const hoursLogged = todayLifts.length;
  const averageLifts = hoursLogged > 0 ? Math.round(totalLifts / hoursLogged) : 0;
  const targetMetCount = todayLifts.filter(log => log.target_met).length;
  const totalDelayMinutes = todayDelays.reduce((sum, d) => sum + (d.duration_minutes || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold">Welcome, {profile?.full_name}</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Container className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalLifts}</p>
                  <p className="text-sm text-muted-foreground">Total Lifts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Target className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{targetMetCount}/{hoursLogged}</p>
                  <p className="text-sm text-muted-foreground">Targets Met</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <TrendingUp className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{averageLifts}</p>
                  <p className="text-sm text-muted-foreground">Avg/Hour</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalDelayMinutes}m</p>
                  <p className="text-sm text-muted-foreground">Delay Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Forms Row */}
        <div className="grid md:grid-cols-2 gap-6">
          <LiftEntryForm onSuccess={fetchTodayData} />
          <DelayEntryForm onSuccess={fetchTodayData} />
        </div>

        {/* Today's Logs */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Lift Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Lift Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-4">Loading...</p>
              ) : todayLifts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No lift logs recorded today</p>
              ) : (
                <div className="space-y-2">
                  {todayLifts.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{log.hour_slot.slice(0, 5)}</span>
                        <span className="font-medium">{log.lifts_count} lifts</span>
                      </div>
                      <Badge variant={log.target_met ? 'default' : 'secondary'}>
                        {log.target_met ? 'Target Met' : 'Below Target'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delay Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Today's Delays
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-4">Loading...</p>
              ) : todayDelays.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No delays recorded today</p>
              ) : (
                <div className="space-y-2">
                  {todayDelays.map((delay) => (
                    <div
                      key={delay.id}
                      className="p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm">
                          {delay.delay_start.slice(0, 5)} - {delay.delay_end.slice(0, 5)}
                        </span>
                        <Badge variant="outline">{delay.duration_minutes}m</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {DELAY_REASON_LABELS[delay.reason]}
                      </p>
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
