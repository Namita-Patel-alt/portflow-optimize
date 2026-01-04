import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ShiftForm from '@/components/operator/ShiftForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WorkShift } from '@/types/database';
import { Clock, Calendar } from 'lucide-react';

export default function OperatorShifts() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShifts = async () => {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('work_shifts')
        .select('*')
        .eq('operator_id', user.id)
        .order('shift_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(20);

      setShifts((data as WorkShift[]) || []);
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, [user]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const isToday = (dateStr: string) => {
    return dateStr === new Date().toISOString().split('T')[0];
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Work Shifts</h1>
          <p className="text-muted-foreground">Manage your working hours and time slots</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <ShiftForm onSuccess={fetchShifts} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Shifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-4">Loading...</p>
              ) : shifts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No shifts recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {shifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{formatDate(shift.shift_date)}</p>
                          <p className="text-sm text-muted-foreground">
                            {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                          </p>
                        </div>
                      </div>
                      {isToday(shift.shift_date) && (
                        <Badge>Today</Badge>
                      )}
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
