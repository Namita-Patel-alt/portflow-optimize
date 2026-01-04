import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  LiftLog, 
  DelayRecord, 
  Profile, 
  TARGET_LIFTS_PER_HOUR,
  DELAY_REASON_LABELS 
} from '@/types/database';
import { 
  Users, 
  Container, 
  AlertTriangle, 
  TrendingUp,
  Target,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface OperatorWithData extends Profile {
  todayLifts: number;
  todayDelays: number;
  avgLifts: number;
  isOnline: boolean;
}

export default function SupervisorDashboard() {
  const { profile } = useAuth();
  const [operators, setOperators] = useState<OperatorWithData[]>([]);
  const [todayLiftLogs, setTodayLiftLogs] = useState<LiftLog[]>([]);
  const [todayDelays, setTodayDelays] = useState<DelayRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    try {
      // Fetch all operator profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

      // Fetch all user roles to filter operators
      const { data: roles } = await supabase
        .from('user_roles')
        .select('*');

      const operatorIds = roles
        ?.filter(r => r.role === 'crane_operator')
        .map(r => r.user_id) || [];

      // Fetch today's lift logs
      const { data: lifts } = await supabase
        .from('lift_logs')
        .select('*')
        .eq('log_date', today);

      setTodayLiftLogs((lifts as LiftLog[]) || []);

      // Fetch today's delays
      const { data: delays } = await supabase
        .from('delay_records')
        .select('*')
        .eq('delay_date', today);

      setTodayDelays((delays as DelayRecord[]) || []);

      // Combine data for operators
      const operatorProfiles = profiles?.filter(p => operatorIds.includes(p.id)) || [];
      const operatorsWithData: OperatorWithData[] = operatorProfiles.map(op => {
        const opLifts = lifts?.filter(l => l.operator_id === op.id) || [];
        const opDelays = delays?.filter(d => d.operator_id === op.id) || [];
        const totalLifts = opLifts.reduce((sum, l) => sum + l.lifts_count, 0);
        const avgLifts = opLifts.length > 0 ? Math.round(totalLifts / opLifts.length) : 0;

        return {
          ...op,
          todayLifts: totalLifts,
          todayDelays: opDelays.reduce((sum, d) => sum + (d.duration_minutes || 0), 0),
          avgLifts,
          isOnline: opLifts.length > 0, // Simple check if they logged today
        } as OperatorWithData;
      });

      setOperators(operatorsWithData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time subscription for lift logs
    const liftChannel = supabase
      .channel('supervisor-lifts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lift_logs' },
        () => fetchData()
      )
      .subscribe();

    // Real-time subscription for delays
    const delayChannel = supabase
      .channel('supervisor-delays')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delay_records' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(liftChannel);
      supabase.removeChannel(delayChannel);
    };
  }, []);

  // Calculate stats
  const totalLiftsToday = todayLiftLogs.reduce((sum, l) => sum + l.lifts_count, 0);
  const totalDelayMinutes = todayDelays.reduce((sum, d) => sum + (d.duration_minutes || 0), 0);
  const activeOperators = operators.filter(op => op.isOnline).length;
  const targetMetPercentage = todayLiftLogs.length > 0
    ? Math.round((todayLiftLogs.filter(l => l.target_met).length / todayLiftLogs.length) * 100)
    : 0;

  // Chart data - Lifts by hour
  const liftsByHour = todayLiftLogs.reduce((acc, log) => {
    const hour = log.hour_slot.slice(0, 5);
    if (!acc[hour]) acc[hour] = 0;
    acc[hour] += log.lifts_count;
    return acc;
  }, {} as Record<string, number>);

  const liftsChartData = Object.entries(liftsByHour)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([hour, lifts]) => ({ hour, lifts, target: TARGET_LIFTS_PER_HOUR }));

  // Chart data - Delays by reason
  const delaysByReason = todayDelays.reduce((acc, delay) => {
    const reason = DELAY_REASON_LABELS[delay.reason];
    if (!acc[reason]) acc[reason] = 0;
    acc[reason] += delay.duration_minutes || 0;
    return acc;
  }, {} as Record<string, number>);

  const delayChartData = Object.entries(delaysByReason).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--destructive))'];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold">Supervisor Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name} • {new Date().toLocaleDateString('en-US', { 
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
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeOperators}/{operators.length}</p>
                  <p className="text-sm text-muted-foreground">Active Operators</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-1/10">
                  <Container className="h-5 w-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalLiftsToday}</p>
                  <p className="text-sm text-muted-foreground">Total Lifts Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-2/10">
                  <Target className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{targetMetPercentage}%</p>
                  <p className="text-sm text-muted-foreground">Targets Met</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-3/10">
                  <AlertTriangle className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalDelayMinutes}m</p>
                  <p className="text-sm text-muted-foreground">Total Delay Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Lifts by Hour Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Lifts by Hour
              </CardTitle>
            </CardHeader>
            <CardContent>
              {liftsChartData.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No lift data for today</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={liftsChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)'
                      }} 
                    />
                    <Bar dataKey="lifts" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Delays by Reason Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Delays by Reason
              </CardTitle>
            </CardHeader>
            <CardContent>
              {delayChartData.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No delays recorded today</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={delayChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${value}m`}
                    >
                      {delayChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 'var(--radius)'
                      }} 
                      formatter={(value: number) => [`${value} minutes`, 'Duration']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Operator Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Operator Status (Real-time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Loading...</p>
            ) : operators.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No operators registered yet</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {operators.map((operator) => {
                  const efficiency = operator.avgLifts > 0 
                    ? Math.round((operator.avgLifts / TARGET_LIFTS_PER_HOUR) * 100) 
                    : 0;
                  const performanceColor = efficiency >= 100 ? 'text-chart-1' : efficiency >= 80 ? 'text-chart-3' : 'text-destructive';

                  return (
                    <div
                      key={operator.id}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium">{operator.full_name}</p>
                          <p className="text-sm text-muted-foreground">{operator.employee_id}</p>
                        </div>
                        <Badge variant={operator.isOnline ? 'default' : 'secondary'}>
                          {operator.isOnline ? 'Active' : 'Idle'}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Efficiency</span>
                          <span className={performanceColor}>{efficiency}%</span>
                        </div>
                        <Progress value={Math.min(efficiency, 100)} className="h-2" />
                        
                        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Container className="h-4 w-4 text-muted-foreground" />
                            <span>{operator.todayLifts} lifts</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{operator.todayDelays}m delay</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
