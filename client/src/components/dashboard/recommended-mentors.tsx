import { useQuery } from "@tanstack/react-query";
import { User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import BookingModal from "@/components/mentors/booking-modal";

export default function RecommendedMentors() {
  const { user } = useAuth();
  const [selectedMentor, setSelectedMentor] = useState<User | null>(null);
  
  const { data: mentors, isLoading } = useQuery<User[]>({
    queryKey: ["/api/mentors"],
    enabled: user?.role === "mentee",
  });
  
  // Filter out mentors and take up to 4 for the recommendation section
  const recommendedMentors = mentors
    ?.filter(mentor => mentor.role === "mentor")
    .slice(0, 4);
  
  const handleConnectClick = (mentor: User) => {
    setSelectedMentor(mentor);
  };
  
  const closeModal = () => {
    setSelectedMentor(null);
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="w-full h-40 rounded-lg mb-4" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center border-b border-gray-200 pb-4 last:border-0">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="ml-3">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="ml-auto">
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (user?.role !== "mentee") {
    return null;
  }
  
  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Recommended Mentors</h2>
          <a href="/find-mentors" className="text-sm text-primary hover:text-primary-dark">View all</a>
        </div>
        
        <div className="mb-4 relative overflow-hidden rounded-lg">
          <img 
            src="https://images.unsplash.com/photo-1542744173-8e7e53415bb0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&h=500" 
            alt="Business mentorship" 
            className="w-full h-40 object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            <p className="text-white font-semibold">Find your ideal mentor today</p>
            <p className="text-white text-sm opacity-90">Over {mentors?.length || 0}+ experts available</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {recommendedMentors && recommendedMentors.length > 0 ? (
            recommendedMentors.map(mentor => (
              <div key={mentor.id} className="flex items-center border-b border-gray-200 pb-4 last:border-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={mentor.profileImage || undefined} alt={`${mentor.firstName} ${mentor.lastName}`} />
                  <AvatarFallback>{mentor.firstName[0]}{mentor.lastName[0]}</AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="font-medium text-sm">{mentor.firstName} {mentor.lastName}</p>
                  <p className="text-xs text-neutral">{mentor.title} at {mentor.organization}</p>
                </div>
                <div className="ml-auto">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white border border-primary text-primary hover:bg-primary-light hover:text-white"
                    onClick={() => handleConnectClick(mentor)}
                  >
                    Connect
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-neutral py-4">No recommended mentors available.</p>
          )}
        </div>
      </div>
      
      {selectedMentor && (
        <BookingModal mentor={selectedMentor} isOpen={!!selectedMentor} onClose={closeModal} />
      )}
    </>
  );
}
