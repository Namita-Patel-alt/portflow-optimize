import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DelayReason, DELAY_REASON_LABELS } from '@/types/database';
import { AlertTriangle, Clock } from 'lucide-react';

interface DelayEntryFormProps {
  onSuccess?: () => void;
}

export default function DelayEntryForm({ onSuccess }: DelayEntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [delayStart, setDelayStart] = useState('');
  const [delayEnd, setDelayEnd] = useState('');
  const [reason, setReason] = useState<DelayReason | ''>('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reason) return;

    // Validate times
    if (delayStart >= delayEnd) {
      toast({
        title: 'Invalid Time Range',
        description: 'End time must be after start time.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('delay_records')
        .insert({
          operator_id: user.id,
          delay_start: delayStart,
          delay_end: delayEnd,
          reason: reason,
          notes: notes || null,
          delay_date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      toast({
        title: 'Delay Recorded',
        description: `Delay from ${delayStart} to ${delayEnd} has been logged.`,
      });

      // Reset form
      setDelayStart('');
      setDelayEnd('');
      setReason('');
      setNotes('');
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

  // Calculate duration if both times are set
  const calculateDuration = () => {
    if (!delayStart || !delayEnd) return null;
    const [startH, startM] = delayStart.split(':').map(Number);
    const [endH, endM] = delayEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const duration = endMinutes - startMinutes;
    if (duration <= 0) return null;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const duration = calculateDuration();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Log Delay
        </CardTitle>
        <CardDescription>
          Record any delays that occurred during your shift with exact times.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="delay-start">Start Time</Label>
              <Input
                id="delay-start"
                type="time"
                value={delayStart}
                onChange={(e) => setDelayStart(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delay-end">End Time</Label>
              <Input
                id="delay-end"
                type="time"
                value={delayEnd}
                onChange={(e) => setDelayEnd(e.target.value)}
                required
              />
            </div>
          </div>

          {duration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Clock className="h-4 w-4" />
              <span>Delay duration: <strong className="text-foreground">{duration}</strong></span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Delay</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as DelayReason)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DELAY_REASON_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Provide any additional details about the delay..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting || !reason}>
            {isSubmitting ? 'Recording...' : 'Record Delay'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
