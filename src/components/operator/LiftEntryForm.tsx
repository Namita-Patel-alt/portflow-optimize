import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { TARGET_LIFTS_PER_HOUR } from '@/types/database';
import { Container, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LiftEntryFormProps {
  onSuccess?: () => void;
}

export default function LiftEntryForm({ onSuccess }: LiftEntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hourSlot, setHourSlot] = useState('');
  const [liftsCount, setLiftsCount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('lift_logs')
        .insert({
          operator_id: user.id,
          hour_slot: hourSlot,
          lifts_count: parseInt(liftsCount),
          log_date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      toast({
        title: 'Lift Log Saved',
        description: `Recorded ${liftsCount} lifts for ${hourSlot}`,
      });

      setHourSlot('');
      setLiftsCount('');
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentLifts = parseInt(liftsCount) || 0;
  const progressPercent = Math.min((currentLifts / TARGET_LIFTS_PER_HOUR) * 100, 100);
  const targetMet = currentLifts >= TARGET_LIFTS_PER_HOUR;

  // Generate time slots for picker
  const timeSlots = [];
  for (let i = 0; i < 24; i++) {
    const hour = i.toString().padStart(2, '0');
    timeSlots.push(`${hour}:00`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Container className="h-5 w-5 text-primary" />
          Log Hourly Lifts
        </CardTitle>
        <CardDescription>
          Record your container lifts for each hour. Target: {TARGET_LIFTS_PER_HOUR} lifts/hour
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hour-slot">Hour Slot</Label>
            <select
              id="hour-slot"
              value={hourSlot}
              onChange={(e) => setHourSlot(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              required
            >
              <option value="">Select time slot</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot} - {(parseInt(slot) + 1).toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lifts-count">Number of Lifts</Label>
            <Input
              id="lifts-count"
              type="number"
              min="0"
              max="100"
              placeholder="24"
              value={liftsCount}
              onChange={(e) => setLiftsCount(e.target.value)}
              required
            />
          </div>

          {/* Progress indicator */}
          {liftsCount && (
            <div className="space-y-2 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Progress to target
                </span>
                <span className={targetMet ? 'text-success font-medium' : 'text-warning font-medium'}>
                  {currentLifts} / {TARGET_LIFTS_PER_HOUR}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex items-center gap-2 text-sm">
                {targetMet ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-success">Target achieved! Great work!</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-warning" />
                    <span className="text-muted-foreground">
                      {TARGET_LIFTS_PER_HOUR - currentLifts} more lifts needed to meet target
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Lift Log'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
