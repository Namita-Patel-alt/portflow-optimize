import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Vehicle, VehicleStatus, VEHICLE_STATUS_LABELS } from '@/types/database';
import { Truck, Plus, Settings } from 'lucide-react';

export default function SupervisorVehicles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');

  const fetchVehicles = async () => {
    try {
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      setVehicles((data as Vehicle[]) || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('vehicles')
        .insert({
          vehicle_number: vehicleNumber,
          vehicle_type: vehicleType,
          status: 'available' as VehicleStatus,
        });

      if (error) throw error;

      toast({
        title: 'Vehicle Added',
        description: `${vehicleNumber} has been added to the fleet.`,
      });

      setVehicleNumber('');
      setVehicleType('');
      setIsAddOpen(false);
      fetchVehicles();
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

  const updateVehicleStatus = async (vehicleId: string, status: VehicleStatus) => {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ status })
        .eq('id', vehicleId);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Vehicle status changed to ${VEHICLE_STATUS_LABELS[status]}.`,
      });

      fetchVehicles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: VehicleStatus) => {
    switch (status) {
      case 'available':
        return 'bg-chart-1/10 text-chart-1 border-chart-1/30';
      case 'in_use':
        return 'bg-chart-2/10 text-chart-2 border-chart-2/30';
      case 'maintenance':
        return 'bg-chart-3/10 text-chart-3 border-chart-3/30';
      case 'unavailable':
        return 'bg-destructive/10 text-destructive border-destructive/30';
      default:
        return '';
    }
  };

  const vehicleTypes = ['Truck', 'Trailer', 'Stacker', 'Forklift', 'Container Carrier'];

  // Group by status
  const vehiclesByStatus = vehicles.reduce((acc, v) => {
    if (!acc[v.status]) acc[v.status] = [];
    acc[v.status].push(v);
    return acc;
  }, {} as Record<VehicleStatus, Vehicle[]>);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Vehicle Management</h1>
            <p className="text-muted-foreground">Manage transport vehicles and their availability</p>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddVehicle} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle-number">Vehicle Number</Label>
                  <Input
                    id="vehicle-number"
                    placeholder="TRK-001"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehicle-type">Vehicle Type</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || !vehicleType}>
                  {isSubmitting ? 'Adding...' : 'Add Vehicle'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[]).map(status => (
            <Card key={status}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{vehiclesByStatus[status]?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">{VEHICLE_STATUS_LABELS[status]}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${getStatusColor(status)}`}>
                    <Truck className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Vehicle List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Fleet Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-center py-4">Loading...</p>
            ) : vehicles.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No vehicles registered yet</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{vehicle.vehicle_number}</p>
                        <p className="text-sm text-muted-foreground">{vehicle.vehicle_type}</p>
                      </div>
                      <Badge className={getStatusColor(vehicle.status)}>
                        {VEHICLE_STATUS_LABELS[vehicle.status]}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Select
                        value={vehicle.status}
                        onValueChange={(v) => updateVehicleStatus(vehicle.id, v as VehicleStatus)}
                      >
                        <SelectTrigger className="flex-1">
                          <Settings className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[]).map(status => (
                            <SelectItem key={status} value={status}>
                              {VEHICLE_STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
