import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiftLog, DelayRecord, TARGET_LIFTS_PER_HOUR, DELAY_REASON_LABELS } from '@/types/database';
import { BarChart3, TrendingUp, AlertTriangle, Users } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function SupervisorAnalytics() {
  const [liftLogs, setLiftLogs] = useState<LiftLog[]>([]);
  const [delays, setDelays] = useState<DelayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');

  const fetchData = async () => {
    const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    try {
      const { data: lifts } = await supabase
        .from('lift_logs')
        .select('*')
        .gte('log_date', startDate.toISOString().split('T')[0])
        .order('log_date', { ascending: true });

      const { data: delayRecords } = await supabase
        .from('delay_records')
        .select('*')
        .gte('delay_date', startDate.toISOString().split('T')[0])
        .order('delay_date', { ascending: true });

      setLiftLogs((lifts as LiftLog[]) || []);
      setDelays((delayRecords as DelayRecord[]) || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [dateRange]);

  // Daily productivity data
  const dailyData = liftLogs.reduce((acc, log) => {
    const date = log.log_date;
    if (!acc[date]) {
      acc[date] = { date, totalLifts: 0, targetMet: 0, total: 0 };
    }
    acc[date].totalLifts += log.lifts_count;
    acc[date].total += 1;
    if (log.target_met) acc[date].targetMet += 1;
    return acc;
  }, {} as Record<string, { date: string; totalLifts: number; targetMet: number; total: number }>);

  const dailyChartData = Object.values(dailyData)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      lifts: d.totalLifts,
      efficiency: d.total > 0 ? Math.round((d.targetMet / d.total) * 100) : 0,
    }));

  // Delay analysis
  const delaysByReason = delays.reduce((acc, delay) => {
    const reason = DELAY_REASON_LABELS[delay.reason];
    if (!acc[reason]) acc[reason] = 0;
    acc[reason] += delay.duration_minutes || 0;
    return acc;
  }, {} as Record<string, number>);

  const delayPieData = Object.entries(delaysByReason).map(([name, value]) => ({
    name,
    value,
  }));

  // Daily delay trend
  const dailyDelays = delays.reduce((acc, delay) => {
    const date = delay.delay_date;
    if (!acc[date]) acc[date] = 0;
    acc[date] += delay.duration_minutes || 0;
    return acc;
  }, {} as Record<string, number>);

  const delayTrendData = Object.entries(dailyDelays)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, minutes]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      minutes,
    }));

  // Stats
  const totalLifts = liftLogs.reduce((sum, l) => sum + l.lifts_count, 0);
  const totalDelayMinutes = delays.reduce((sum, d) => sum + (d.duration_minutes || 0), 0);
  const avgEfficiency = liftLogs.length > 0
    ? Math.round((liftLogs.filter(l => l.target_met).length / liftLogs.length) * 100)
    : 0;

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--destructive))'];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Performance trends and operational insights</p>
          </div>

          <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
            <TabsList>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
              <TabsTrigger value="90d">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-1/10">
                  <TrendingUp className="h-5 w-5 text-chart-1" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalLifts.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total Lifts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-2/10">
                  <Users className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{avgEfficiency}%</p>
                  <p className="text-sm text-muted-foreground">Target Achievement</p>
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
                  <p className="text-2xl font-bold">{Math.round(totalDelayMinutes / 60)}h</p>
                  <p className="text-sm text-muted-foreground">Total Delay Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Daily Productivity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Daily Productivity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyChartData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
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

            {/* Efficiency Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Efficiency Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyChartData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'var(--radius)'
                        }}
                        formatter={(value: number) => [`${value}%`, 'Efficiency']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="efficiency" 
                        stroke="hsl(var(--chart-1))" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Delay Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Delay Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {delayPieData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No delay data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={delayPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {delayPieData.map((_, index) => (
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

            {/* Delay Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Daily Delay Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {delayTrendData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No delay data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={delayTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 'var(--radius)'
                        }}
                        formatter={(value: number) => [`${value} minutes`, 'Delay']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="minutes" 
                        stroke="hsl(var(--chart-3))" 
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
