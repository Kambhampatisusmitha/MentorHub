import { useQuery } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { Session, User, Feedback, insertFeedbackSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Calendar, Video, Star, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { GlowingEffect } from "@/components/ui/glowing-effect";

interface SessionCardProps {
  session: Session;
}

export default function SessionCard({ session }: SessionCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  // Strictly verify session ownership based on user's role
  const isOwnSession = user?.role === "mentor" 
    ? session.mentorId === user?.id 
    : session.menteeId === user?.id;

  const isMentor = user?.role === "mentor";
  const participantId = isMentor ? session.menteeId : session.mentorId;
  
  const { data: participant } = useQuery<User>({
    queryKey: [`/api/profile/${participantId}`],
    enabled: !!participantId && isOwnSession,
  });
  
  // Check if the user has already provided feedback for this session
  const { data: userFeedback } = useQuery<Feedback[]>({
    queryKey: ["/api/feedback/given"],
    enabled: session.status === "completed" && isOwnSession,
  });
  
  // Determine if the user has already left feedback for this session
  const hasLeftFeedback = userFeedback?.some(
    feedback => feedback.sessionId === session.id && feedback.fromId === user?.id
  ) || false;

  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/sessions/${id}`, { status });
      return await res.json();
    },
    onSuccess: (_: any, variables: { id: number; status: string }) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
      
      // Show appropriate toast messages based on the new status
      if (variables.status === "completed") {
        toast({
          title: "Session marked as completed",
          description: isMentor 
            ? "Mentee will now be able to leave feedback." 
            : "The mentor has ended this session. Please leave your feedback.",
        });
      } else if (variables.status === "canceled") {
        toast({
          title: "Session canceled",
          description: "The session has been canceled successfully.",
        });
      } else {
        toast({
          title: `Session ${variables.status}`,
          description: `The session has been ${variables.status} successfully.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedbackData: z.infer<typeof insertFeedbackSchema>) => {
      const res = await apiRequest("POST", "/api/feedback", feedbackData);
      return await res.json();
    },
    onSuccess: () => {
      setShowFeedbackModal(false);
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback!",
      });
      
      // Invalidate all relevant feedback queries
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feedback/given"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit feedback",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: string, time: string) => {
    const dateObj = parseISO(`${date}T${time}`);
    // Format with the user's local timezone automatically included
    return format(dateObj, "EEEE, MMMM d, yyyy 'at' h:mm a (z)");
  };

  const handleJoinSession = () => {
    if (!session.meetingLink) {
      toast({
        title: "No meeting link available",
        description: "This session doesn't have a Google Meet link yet.",
        variant: "destructive"
      });
      return;
    }
    
    // Debug log for the meeting link
    console.log('Attempting to join meeting with link:', session.meetingLink);
    
    // Format the Google Meet URL correctly if needed
    let meetingUrl = session.meetingLink.trim();
    if (!meetingUrl.startsWith('http')) {
      if (meetingUrl.includes('meet.google.com')) {
        meetingUrl = `https://${meetingUrl}`;
      } else {
        meetingUrl = `https://meet.google.com/${meetingUrl}`;
      }
    }
    // Remove any trailing or leading whitespace
    meetingUrl = meetingUrl.replace(/\s+/g, '');
    // Open in a new tab
    window.open(meetingUrl, "_blank");
    toast({
      title: "Joining meeting",
      description: "Opening Google Meet in a new tab...",
    });
  };

  const handleCancel = () => {
    // Ensure the user is part of this session
    if (session.mentorId !== user?.id && session.menteeId !== user?.id) {
      toast({
        title: "Permission Denied",
        description: "You can only cancel sessions that you are a part of.",
        variant: "destructive"
      });
      return;
    }
    
    updateSessionMutation.mutate({ id: session.id, status: "canceled" });
  };

  const handleLeaveFeedback = () => {
    setShowFeedbackModal(true);
  };

  const submitFeedback = () => {
    const feedbackData = {
      sessionId: session.id,
      fromId: user!.id,
      toId: isMentor ? session.menteeId : session.mentorId,
      rating,
      comment,
    };
    submitFeedbackMutation.mutate(feedbackData);
  };

  // Session card status styling
  const getStatusBadgeStyle = () => {
    switch (session.status) {
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/50";
      case "approved":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800/50";
      case "completed":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/50";
      case "canceled":
      case "rejected":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/50";
      default:
        return "bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    }
  };
  
  // Get gradient background based on status
  const getGradientBackground = () => {
    switch (session.status) {
      case "pending":
        return "from-yellow-500/10 to-amber-600/5";
      case "approved":
        return "from-blue-500/10 to-indigo-600/5";
      case "completed":
        return "from-green-500/10 to-emerald-600/5";
      case "canceled":
      case "rejected":
        return "from-red-500/10 to-rose-600/5";
      default:
        return "from-gray-500/10 to-slate-600/5";
    }
  };
  
  // Get shadow color based on status
  const getShadowStyle = () => {
    switch (session.status) {
      case "pending":
        return "shadow-[0_0_20px_rgba(245,158,11,0.15)]";
      case "approved":
        return "shadow-[0_0_20px_rgba(59,130,246,0.15)]";
      case "completed":
        return "shadow-[0_0_20px_rgba(34,197,94,0.15)]";
      case "canceled":
      case "rejected":
        return "shadow-[0_0_20px_rgba(239,68,68,0.15)]";
      default:
        return "shadow-sm";
    }
  };
  
  // Get border color based on status
  const getBorderStyle = () => {
    switch (session.status) {
      case "pending":
        return "border-yellow-200 dark:border-yellow-800/30";
      case "approved":
        return "border-blue-200 dark:border-blue-800/30";
      case "completed":
        return "border-green-200 dark:border-green-800/30";
      case "canceled":
      case "rejected":
        return "border-red-200 dark:border-red-800/30";
      default:
        return "border-gray-200 dark:border-gray-700/50";
    }
  };

  // For privacy reasons, we only show the full name of the other participant if:
  // 1. We have completed the session already (post-session)
  // 2. The user is the owner of the session
  const shouldShowFullName = isOwnSession && session.status === "completed";
  
  const participantName = shouldShowFullName && participant 
    ? `${participant.firstName} ${participant.lastName}`
    : `${isMentor ? 'Mentee' : 'Mentor'}`;

  return (
    <>
      <div className="relative rounded-xl overflow-hidden mb-4">
        <div className={`absolute inset-0 bg-gradient-to-br ${getGradientBackground()} opacity-30`} />
        
        <div className="relative">
          <div className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl ${getShadowStyle()} border ${getBorderStyle()}`}>
            <div className="absolute inset-0">
              <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={2}
              />
            </div>
            
            <div className="p-6 relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-grow mb-4 md:mb-0">
                  <div className="flex items-center mb-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeStyle()}`}>
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{session.topic}</h3>
                  <div className="flex items-center text-neutral-500 mb-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-sm">{formatDate(session.date, session.time)}</span>
                  </div>
                  <div className="flex items-center text-neutral-500">
                    <Video className="h-4 w-4 mr-2" />
                    <span className="text-sm">Video meeting with {participantName}</span>
                  </div>
                  {session.notes && (
                    <p className="mt-3 text-sm bg-neutral-50 p-3 rounded-md border border-neutral-200">
                      <span className="font-medium">Session notes:</span> {session.notes}
                    </p>
                  )}
                </div>
                
                <div className="flex flex-col space-y-2 md:ml-4 md:w-36">
                  {session.status === "approved" && (
                    <div className="mt-5 flex flex-col sm:flex-row gap-2">
                      <Button 
                        onClick={handleJoinSession} 
                        className="sm:flex-1 bg-primary/90 hover:bg-primary text-white shadow-md hover:shadow-lg transition-all duration-300"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Join Session
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={handleCancel}
                        className="sm:flex-1 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                  {/* Only show cancel button for sessions that are not already completed or canceled */}
                  {(session.mentorId === user?.id || session.menteeId === user?.id) && 
                   session.status !== "completed" && 
                   session.status !== "canceled" && 
                   session.status !== "rejected" && (
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showFeedbackModal} onOpenChange={setShowFeedbackModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Feedback</DialogTitle>
            <DialogDescription>
              Share your experience about the session with {participantName}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {participant && (
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20 dark:ring-primary/10">
                    <AvatarImage src={participant.profileImage || undefined} alt={participantName} />
                    <AvatarFallback className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/90">
                      {participant.firstName?.[0]}{participant.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              <div>
                <h3 className="font-medium text-foreground dark:text-white text-lg">{participantName}</h3>
                <p className="text-sm text-neutral dark:text-gray-300">{session.topic}</p>
              </div>
            </div>
            
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-primary/10 dark:bg-primary/20 mr-3">
                  <Calendar className="h-4 w-4 text-primary dark:text-primary/90" />
                </div>
                <span className="text-sm text-foreground dark:text-white/90">
                  {formatDate(session.date, session.time)}
                </span>
              </div>
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-primary/10 dark:bg-primary/20 mr-3">
                  <Video className="h-4 w-4 text-primary dark:text-primary/90" />
                </div>
                <span className="text-sm text-foreground dark:text-white/90">
                  {session.meetingLink ? "Video Meeting" : "No meeting link yet"}
                </span>
              </div>
            </div>
            
            <div className="mt-5">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle()}`}>
                {session.status === "pending" && <Clock className="h-3 w-3 mr-1.5" />}
                {session.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1.5" />}
                {session.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1.5" />}
                {(session.status === "canceled" || session.status === "rejected") && <XCircle className="h-3 w-3 mr-1.5" />}
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFeedbackModal(false)}>
                Cancel
              </Button>
              <Button onClick={submitFeedback} disabled={submitFeedbackMutation.isPending}>
                {submitFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
