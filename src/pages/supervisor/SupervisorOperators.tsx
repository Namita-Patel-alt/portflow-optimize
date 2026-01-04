import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Profile, 
  LiftLog, 
  DelayRecord, 
  WorkShift,
  TARGET_LIFTS_PER_HOUR,
  DELAY_REASON_LABELS 
} from '@/types/database';
import { Users, Container, AlertTriangle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface OperatorDetails extends Profile {
  shifts: WorkShift[];
  liftLogs: LiftLog[];
  delays: DelayRecord[];
}

export default function SupervisorOperators() {
  const [operators, setOperators] = useState<OperatorDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOperator, setExpandedOperator] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchOperators = async () => {
    try {
      // Fetch operator profiles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'crane_operator');

      const operatorIds = roles?.map(r => r.user_id) || [];

      if (operatorIds.length === 0) {
        setOperators([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', operatorIds);

      // Fetch shifts for all operators (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data: shifts } = await supabase
        .from('work_shifts')
        .select('*')
        .in('operator_id', operatorIds)
        .gte('shift_date', weekAgo.toISOString().split('T')[0])
        .order('shift_date', { ascending: false });

      // Fetch lift logs for all operators (last 7 days)
      const { data: liftLogs } = await supabase
        .from('lift_logs')
        .select('*')
        .in('operator_id', operatorIds)
        .gte('log_date', weekAgo.toISOString().split('T')[0])
        .order('log_date', { ascending: false });

      // Fetch delays for all operators (last 7 days)
      const { data: delays } = await supabase
        .from('delay_records')
        .select('*')
        .in('operator_id', operatorIds)
        .gte('delay_date', weekAgo.toISOString().split('T')[0])
        .order('delay_date', { ascending: false });

      // Combine data
      const operatorsWithDetails: OperatorDetails[] = (profiles || []).map(profile => ({
        ...profile,
        shifts: (shifts || []).filter(s => s.operator_id === profile.id) as WorkShift[],
        liftLogs: (liftLogs || []).filter(l => l.operator_id === profile.id) as LiftLog[],
        delays: (delays || []).filter(d => d.operator_id === profile.id) as DelayRecord[],
      }));

      setOperators(operatorsWithDetails);
    } catch (error) {
      console.error('Error fetching operators:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperators();

    // Real-time subscriptions
    const channels = ['lift_logs', 'delay_records', 'work_shifts'].map(table => 
      supabase
        .channel(`supervisor-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => fetchOperators())
        .subscribe()
    );

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Operator Management</h1>
          <p className="text-muted-foreground">View detailed schedules and performance for all operators</p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading operators...</div>
        ) : operators.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No operators registered yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {operators.map((operator) => {
              const totalLifts = operator.liftLogs.reduce((sum, l) => sum + l.lifts_count, 0);
              const totalDelay = operator.delays.reduce((sum, d) => sum + (d.duration_minutes || 0), 0);
              const avgLifts = operator.liftLogs.length > 0 
                ? Math.round(totalLifts / operator.liftLogs.length) 
                : 0;
              const efficiency = avgLifts > 0 
                ? Math.round((avgLifts / TARGET_LIFTS_PER_HOUR) * 100) 
                : 0;
              const isExpanded = expandedOperator === operator.id;
              const todayLogs = operator.liftLogs.filter(l => l.log_date === today);
              const isActive = todayLogs.length > 0;

              return (
                <Card key={operator.id}>
                  <Collapsible open={isExpanded} onOpenChange={() => setExpandedOperator(isExpanded ? null : operator.id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{operator.full_name}</CardTitle>
                              <p className="text-sm text-muted-foreground">{operator.employee_id}</p>
                            </div>
                            <Badge variant={isActive ? 'default' : 'secondary'}>
                              {isActive ? 'Active Today' : 'Idle'}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right hidden md:block">
                              <p className="text-sm font-medium">{totalLifts} lifts</p>
                              <p className="text-xs text-muted-foreground">Last 7 days</p>
                            </div>
                            <div className="text-right hidden md:block">
                              <p className="text-sm font-medium">{efficiency}% efficiency</p>
                              <Progress value={Math.min(efficiency, 100)} className="h-2 w-20" />
                            </div>
                            <Button variant="ghost" size="icon">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="border-t">
                        <div className="grid md:grid-cols-3 gap-6 pt-4">
                          {/* Shifts */}
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <Clock className="h-4 w-4" /> Recent Shifts
                            </h4>
                            {operator.shifts.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No shifts recorded</p>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {operator.shifts.slice(0, 5).map(shift => (
                                  <div key={shift.id} className="text-sm p-2 rounded bg-muted/50">
                                    <p className="font-medium">{formatDate(shift.shift_date)}</p>
                                    <p className="text-muted-foreground">
                                      {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Lift Logs */}
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <Container className="h-4 w-4" /> Recent Lifts
                            </h4>
                            {operator.liftLogs.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No lift logs recorded</p>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {operator.liftLogs.slice(0, 8).map(log => (
                                  <div key={log.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                                    <span>{formatDate(log.log_date)} {log.hour_slot.slice(0, 5)}</span>
                                    <Badge variant={log.target_met ? 'default' : 'secondary'} className="text-xs">
                                      {log.lifts_count} lifts
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Delays */}
                          <div>
                            <h4 className="font-medium mb-3 flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" /> Recent Delays ({totalDelay}m total)
                            </h4>
                            {operator.delays.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No delays recorded</p>
                            ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {operator.delays.slice(0, 5).map(delay => (
                                  <div key={delay.id} className="text-sm p-2 rounded bg-muted/50">
                                    <div className="flex justify-between">
                                      <span>{formatDate(delay.delay_date)}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {delay.duration_minutes}m
                                      </Badge>
                                    </div>
                                    <p className="text-muted-foreground text-xs">
                                      {DELAY_REASON_LABELS[delay.reason]}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
