import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Profile, PerformanceRating, LiftLog, TARGET_LIFTS_PER_HOUR } from '@/types/database';
import { Star, Plus, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OperatorWithStats extends Profile {
  avgLifts: number;
  ratings: PerformanceRating[];
  avgRating: number;
}

export default function SupervisorRatings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [operators, setOperators] = useState<OperatorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOperator, setSelectedOperator] = useState<OperatorWithStats | null>(null);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');

  const fetchData = async () => {
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

      // Fetch lift logs (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: liftLogs } = await supabase
        .from('lift_logs')
        .select('*')
        .in('operator_id', operatorIds)
        .gte('log_date', thirtyDaysAgo.toISOString().split('T')[0]);

      // Fetch ratings
      const { data: ratings } = await supabase
        .from('performance_ratings')
        .select('*')
        .in('operator_id', operatorIds)
        .order('rating_date', { ascending: false });

      // Combine data
      const operatorsWithStats: OperatorWithStats[] = (profiles || []).map(profile => {
        const opLogs = (liftLogs || []).filter(l => l.operator_id === profile.id) as LiftLog[];
        const opRatings = (ratings || []).filter(r => r.operator_id === profile.id) as PerformanceRating[];
        
        const totalLifts = opLogs.reduce((sum, l) => sum + l.lifts_count, 0);
        const avgLifts = opLogs.length > 0 ? Math.round(totalLifts / opLogs.length) : 0;
        const avgRating = opRatings.length > 0
          ? Math.round((opRatings.reduce((sum, r) => sum + r.rating, 0) / opRatings.length) * 10) / 10
          : 0;

        return {
          ...profile,
          avgLifts,
          ratings: opRatings,
          avgRating,
        } as OperatorWithStats;
      });

      // Sort by average lifts descending
      operatorsWithStats.sort((a, b) => b.avgLifts - a.avgLifts);

      setOperators(operatorsWithStats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedOperator || rating === 0) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('performance_ratings')
        .insert({
          operator_id: selectedOperator.id,
          rated_by: user.id,
          rating,
          comments: comments || null,
          rating_date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      toast({
        title: 'Rating Submitted',
        description: `${selectedOperator.full_name} has been rated ${rating} stars.`,
      });

      setRating(0);
      setComments('');
      setIsRatingOpen(false);
      setSelectedOperator(null);
      fetchData();
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

  const getSuggestedRating = (avgLifts: number) => {
    if (avgLifts >= 28) return 5;
    if (avgLifts >= 26) return 4;
    if (avgLifts >= 24) return 3;
    if (avgLifts >= 20) return 2;
    return 1;
  };

  const getPerformanceLabel = (avgLifts: number) => {
    if (avgLifts >= 28) return { label: 'Exceptional', color: 'text-chart-1' };
    if (avgLifts >= 26) return { label: 'Excellent', color: 'text-chart-1' };
    if (avgLifts >= 24) return { label: 'On Target', color: 'text-chart-2' };
    if (avgLifts >= 20) return { label: 'Below Target', color: 'text-chart-3' };
    return { label: 'Needs Improvement', color: 'text-destructive' };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold">Performance Ratings</h1>
          <p className="text-muted-foreground">Rate operators based on their productivity</p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : operators.length === 0 ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No operators to rate</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {operators.map((operator, index) => {
              const performance = getPerformanceLabel(operator.avgLifts);
              const suggestedRating = getSuggestedRating(operator.avgLifts);

              return (
                <Card key={operator.id} className="relative overflow-hidden">
                  {index < 3 && (
                    <div className="absolute top-0 right-0 bg-chart-3 text-chart-3-foreground px-2 py-1 text-xs font-medium rounded-bl">
                      #{index + 1}
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div>
                        <p className="text-lg">{operator.full_name}</p>
                        <p className="text-sm font-normal text-muted-foreground">{operator.employee_id}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "h-4 w-4",
                              star <= operator.avgRating
                                ? "text-chart-3 fill-chart-3"
                                : "text-muted"
                            )}
                          />
                        ))}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Avg Lifts/Hour</span>
                        </div>
                        <span className="font-medium">{operator.avgLifts}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Performance</span>
                        <span className={cn("font-medium", performance.color)}>
                          {performance.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Avg Rating</span>
                        <span className="font-medium">
                          {operator.avgRating > 0 ? `${operator.avgRating}/5` : 'Not rated'}
                        </span>
                      </div>

                      <Dialog open={isRatingOpen && selectedOperator?.id === operator.id} onOpenChange={(open) => {
                        setIsRatingOpen(open);
                        if (open) {
                          setSelectedOperator(operator);
                          setRating(suggestedRating);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button className="w-full" variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Rating
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Rate {operator.full_name}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSubmitRating} className="space-y-4">
                            <div className="space-y-2">
                              <Label>Suggested Rating (based on {operator.avgLifts} avg lifts/hour)</Label>
                              <div className="flex items-center gap-2 justify-center py-4">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className="focus:outline-none"
                                  >
                                    <Star
                                      className={cn(
                                        "h-8 w-8 transition-colors cursor-pointer",
                                        star <= rating
                                          ? "text-chart-3 fill-chart-3"
                                          : "text-muted hover:text-chart-3/50"
                                      )}
                                    />
                                  </button>
                                ))}
                              </div>
                              <p className="text-center text-sm text-muted-foreground">
                                {rating === 0 ? 'Select a rating' : `${rating} out of 5 stars`}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="comments">Comments (Optional)</Label>
                              <Textarea
                                id="comments"
                                placeholder="Add any feedback or observations..."
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                rows={3}
                              />
                            </div>

                            <Button type="submit" className="w-full" disabled={isSubmitting || rating === 0}>
                              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
