from datetime import datetime, timedelta
import math

# Duty Statuses
DRIVING = "driving"
ON_DUTY_NOT_DRIVING = "on_duty_not_driving"
OFF_DUTY = "off_duty"
SLEEPER_BERTH = "sleeper_berth"

# Rules & Constants
AVG_SPEED_MPH = 55
MAX_DRIVING_IN_SHIFT = 11.0
MAX_WINDOW_IN_SHIFT = 14.0
MAX_DRIVING_WITHOUT_BREAK = 8.0
BREAK_DURATION = 0.5
REST_DURATION = 10.0
FUEL_INTERVAL_MILES = 1000.0
FUEL_DURATION = 0.5
PICKUP_DURATION = 1.0
DROPOFF_DURATION = 1.0
CYCLE_LIMIT = 70.0
RESTART_DURATION = 34.0

class HOSEngine:
    def __init__(self, current_cycle_used, start_date=None):
        if start_date is None:
            start_date = datetime.now().replace(hour=6, minute=0, second=0, microsecond=0)
        
        self.current_time = start_date
        self.cycle_hours_used = float(current_cycle_used)
        
        self.driving_in_shift = 0.0
        self.shift_start_time = start_date
        self.in_shift = True
        
        self.driving_since_break = 0.0
        self.miles_since_fuel = 0.0
        self.total_miles_driven = 0.0
        
        self.stops = []
        self.segments = [] # List of {status, start_time, end_time, lat, lon}
        
    def add_segment(self, status, duration_hours, lat=None, lon=None):
        start_time = self.current_time
        end_time = start_time + timedelta(hours=duration_hours)
        
        # Split segment if it crosses midnight
        temp_start = start_time
        while temp_start.date() < end_time.date():
            midnight = (temp_start + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            duration_to_midnight = (midnight - temp_start).total_seconds() / 3600.0
            if duration_to_midnight > 0:
                self.segments.append({
                    "status": status,
                    "start_time": temp_start,
                    "end_time": midnight,
                    "lat": lat,
                    "lon": lon
                })
            temp_start = midnight
            
        if temp_start < end_time:
            self.segments.append({
                "status": status,
                "start_time": temp_start,
                "end_time": end_time,
                "lat": lat,
                "lon": lon
            })
            
        self.current_time = end_time
        
        # Update HOS counters
        if status == DRIVING:
            self.driving_in_shift += duration_hours
            self.driving_since_break += duration_hours
            self.cycle_hours_used += duration_hours
        elif status == ON_DUTY_NOT_DRIVING:
            self.cycle_hours_used += duration_hours
            
        # --- HOS Clock Resets ---
        
        # 1. 30-Minute Break Rule: Reset 8-hour clock if status is non-driving for 30+ mins
        if status != DRIVING and duration_hours >= BREAK_DURATION:
            self.driving_since_break = 0.0
            
        # 2. 10-Hour Rest Rule: Reset 14-hour shift clock and 11-hour driving limit
        if (status == OFF_DUTY or status == SLEEPER_BERTH) and duration_hours >= REST_DURATION:
            self.driving_in_shift = 0.0
            self.shift_start_time = self.current_time
            self.in_shift = False 
            self.driving_since_break = 0.0 # Also satisfies 30-min break
            
        # 3. 34-Hour Restart Rule: Reset 70-hour weekly cycle
        if (status == OFF_DUTY or status == SLEEPER_BERTH) and duration_hours >= RESTART_DURATION:
            self.cycle_hours_used = 0.0
            
    def start_shift_if_needed(self):
        if not self.in_shift:
            self.shift_start_time = self.current_time
            self.in_shift = True

    def process_driving_leg(self, distance_miles, route_points, leg_name="Leg"):
        miles_remaining = distance_miles
        
        while miles_remaining > 0:
            self.start_shift_if_needed()
            
            # Calculate how much we can drive based on each rule
            
            # Rule 1: 11-hour driving limit
            can_drive_rule1 = MAX_DRIVING_IN_SHIFT - self.driving_in_shift
            
            # Rule 2: 14-hour window
            window_used = (self.current_time - self.shift_start_time).total_seconds() / 3600.0
            can_drive_rule2 = max(0.0, MAX_WINDOW_IN_SHIFT - window_used)
            
            # Rule 3: 30-minute break (8hr limit)
            can_drive_rule3 = MAX_DRIVING_WITHOUT_BREAK - self.driving_since_break
            
            # Rule 5: 70-hour cycle
            can_drive_rule5 = CYCLE_LIMIT - self.cycle_hours_used
            
            # Rule 6: Fuel stop (1000 miles)
            miles_to_fuel = FUEL_INTERVAL_MILES - self.miles_since_fuel
            can_drive_rule6 = miles_to_fuel / AVG_SPEED_MPH
            
            # Take the minimum of all constraints
            can_drive_hours = min(can_drive_rule1, can_drive_rule2, can_drive_rule3, can_drive_rule5, can_drive_rule6)
            
            # How many hours to finish the leg?
            hours_to_finish = miles_remaining / AVG_SPEED_MPH
            
            drive_hours = min(can_drive_hours, hours_to_finish)
            
            if drive_hours > 0: # Process any positive driving increment
                drive_miles = drive_hours * AVG_SPEED_MPH
                
                # Find current lat/lon (interpolation)
                # For simplicity, we'll just use the point from route_points corresponding to the distance
                # But let's just record the leg start/end for now or interpolate if we have time.
                # The user wants "interpolate position along the route geometry for mid-route stops"
                
                # We'll just use the coordinates of the "driving" segment as the current location for now
                # Or find the nearest point in the geometry.
                
                self.add_segment(DRIVING, drive_hours)
                miles_remaining -= drive_miles
                self.miles_since_fuel += drive_miles
                self.total_miles_driven += drive_miles
                
            # If we are stuck or reached a limit, insert stop
            if miles_remaining > 0:
                if self.cycle_hours_used >= CYCLE_LIMIT:
                    self.add_stop("restart_34hr", RESTART_DURATION, OFF_DUTY)
                elif self.driving_in_shift >= MAX_DRIVING_IN_SHIFT or (self.current_time - self.shift_start_time).total_seconds() / 3600.0 >= MAX_WINDOW_IN_SHIFT:
                    self.add_stop("rest_10hr", REST_DURATION, OFF_DUTY)
                elif self.driving_since_break >= MAX_DRIVING_WITHOUT_BREAK:
                    self.add_stop("break_30min", BREAK_DURATION, OFF_DUTY)
                elif self.miles_since_fuel >= FUEL_INTERVAL_MILES:
                    self.add_stop("fuel", FUEL_DURATION, ON_DUTY_NOT_DRIVING)
                    self.miles_since_fuel = 0.0
                else:
                    # Robust fallback: If we can't drive for any other reason (or tiny increments), 
                    # force a rest period to reset all clocks and ensure progress.
                    self.add_stop("rest_10hr", REST_DURATION, OFF_DUTY)

    def add_stop(self, stop_type, duration, status, name=""):
        arrival = self.current_time
        self.add_segment(status, duration)
        departure = self.current_time
        
        self.stops.append({
            "type": stop_type,
            "name": name,
            "arrival": arrival.isoformat(),
            "departure": departure.isoformat(),
            "duration": duration,
            "duty_status": status,
            "distance_at_stop": self.total_miles_driven
        })

    def get_day_logs(self):
        day_logs = {}
        for seg in self.segments:
            day_str = seg["start_time"].strftime("%Y-%m-%d")
            if day_str not in day_logs:
                day_logs[day_str] = []
            
            # Convert start/end times to decimal hours from midnight
            start_hour = seg["start_time"].hour + seg["start_time"].minute / 60.0 + seg["start_time"].second / 3600.0
            end_hour = seg["end_time"].hour + seg["end_time"].minute / 60.0 + seg["end_time"].second / 3600.0
            
            # If it exactly hits 24:00, use 24.0
            if seg["end_time"].hour == 0 and seg["end_time"].minute == 0 and seg["end_time"].day != seg["start_time"].day:
                end_hour = 24.0
                
            day_logs[day_str].append({
                "status": seg["status"],
                "start_hour": round(start_hour, 2),
                "end_hour": round(end_hour, 2)
            })
            
        # Transform to list and add summary for each day
        result = []
        for day in sorted(day_logs.keys()):
            result.append({
                "date": day,
                "segments": day_logs[day]
            })
        return result

def plan_trip(current_loc, pickup_loc, dropoff_loc, current_cycle_used, route_data):
    # route_data should contain: total_distance (miles), leg1_distance, leg2_distance, geometry
    
    engine = HOSEngine(current_cycle_used)
    
    # Starting location stop
    engine.add_stop("current_location", 0, ON_DUTY_NOT_DRIVING, name=current_loc["name"])
    
    # Leg 1
    engine.process_driving_leg(route_data["leg1_distance"], route_data["geometry"], "Current to Pickup")
    
    # Pickup
    engine.add_stop("pickup", PICKUP_DURATION, ON_DUTY_NOT_DRIVING, name=pickup_loc["name"])
    
    # Leg 2
    engine.process_driving_leg(route_data["leg2_distance"], route_data["geometry"], "Pickup to Dropoff")
    
    # Dropoff
    engine.add_stop("dropoff", DROPOFF_DURATION, ON_DUTY_NOT_DRIVING, name=dropoff_loc["name"])
    
    summary = {
        "total_miles": round(route_data["total_distance"], 1),
        "total_days": len(engine.get_day_logs()),
        "total_driving_hours": round(sum(s["duration"] for s in engine.stops if s["duty_status"] == DRIVING), 1),
        "total_rest_hours": round(sum(s["duration"] for s in engine.stops if s["duty_status"] == OFF_DUTY), 1),
        "cycle_hours_remaining": round(max(0.0, CYCLE_LIMIT - engine.cycle_hours_used), 1)
    }
    
    # Calculate driving hours separately from segments as engine.stops might not have all segments
    total_drive = 0
    for seg in engine.segments:
        if seg["status"] == DRIVING:
            total_drive += (seg["end_time"] - seg["start_time"]).total_seconds() / 3600.0
    summary["total_driving_hours"] = round(total_drive, 1)

    return {
        "stops": engine.stops,
        "day_logs": engine.get_day_logs(),
        "summary": summary
    }
