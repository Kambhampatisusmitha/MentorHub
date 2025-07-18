import { useQuery, useMutation } from "@tanstack/react-query";
import { Skill, insertSkillSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";

type SkillFormValues = z.infer<typeof insertSkillSchema>;

export default function SkillsProgress() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  
  const { data: skills, isLoading } = useQuery<Skill[]>({
    queryKey: ["/api/skills"],
    enabled: user?.role === "mentee",
  });
  
  const form = useForm<SkillFormValues>({
    resolver: zodResolver(
      insertSkillSchema.pick({
        name: true,
        progress: true,
      })
    ),
    defaultValues: {
      name: "",
      progress: 0,
    },
  });
  
  const addSkillMutation = useMutation({
    mutationFn: async (values: SkillFormValues) => {
      const res = await apiRequest("POST", "/api/skills", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      setIsAddingSkill(false);
      form.reset();
      toast({
        title: "Skill added",
        description: "Your new skill has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add skill",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateSkillMutation = useMutation({
    mutationFn: async ({ id, progress }: { id: number; progress: number }) => {
      const res = await apiRequest("PUT", `/api/skills/${id}`, { progress });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/skills"] });
      toast({
        title: "Skill updated",
        description: "Your skill progress has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update skill",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (values: SkillFormValues) => {
    addSkillMutation.mutate(values);
  };
  
  const handleProgressChange = (id: number, progress: number[]) => {
    updateSkillMutation.mutate({ id, progress: progress[0] });
  };
  
  if (user?.role !== "mentee") {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-9 w-full mt-6" />
      </div>
    );
  }
  
  const getColorClass = (progress: number) => {
    if (progress >= 80) return "bg-accent";
    if (progress >= 60) return "bg-secondary";
    if (progress >= 40) return "bg-primary";
    if (progress >= 20) return "bg-purple-500";
    return "bg-red-500";
  };
  
  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Skills Progress</h2>
        
        {skills && skills.length > 0 ? (
          <div className="space-y-4">
            {skills.map((skill) => (
              <div key={skill.id}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">{skill.name}</span>
                  <span className="text-sm text-neutral">{skill.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${getColorClass(skill.progress)} h-2 rounded-full`}
                    style={{ width: `${skill.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-neutral py-4">No skills added yet. Add skills to track your progress.</p>
        )}
        
        <Button
          onClick={() => setIsAddingSkill(true)}
          className="block w-full text-center mt-6"
          variant="outline"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Skill
        </Button>
      </div>
      
      <Dialog open={isAddingSkill} onOpenChange={setIsAddingSkill}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a new skill</DialogTitle>
            <DialogDescription>
              Track your progress in a new skill area.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skill Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Leadership, Public Speaking" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="progress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Progress: {field.value}%</FormLabel>
                    <FormControl>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        defaultValue={[field.value]}
                        onValueChange={(values) => field.onChange(values[0])}
                        className="py-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => setIsAddingSkill(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={addSkillMutation.isPending}>
                  {addSkillMutation.isPending ? "Adding..." : "Add Skill"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
