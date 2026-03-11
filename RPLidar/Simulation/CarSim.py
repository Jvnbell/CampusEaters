# rc_lidar_sim.py
# Standalone copy of the simulator. Run: python rc_lidar_sim.py
# (same content as the notebook cell; trimmed for portability)
import math, random
from dataclasses import dataclass
from typing import List, Tuple, Iterable, Optional
import numpy as np
import matplotlib.pyplot as plt

@dataclass
class Rectangle:
    x: float; y: float; w: float; h: float
    def ray_intersect(self, x0, y0, dx, dy):
        tmin, tmax = -1e18, 1e18
        if abs(dx) < 1e-9:
            if not (self.x <= x0 <= self.x + self.w): return None
        else:
            tx1 = (self.x - x0) / dx; tx2 = (self.x + self.w - x0) / dx
            tmin = max(tmin, min(tx1, tx2)); tmax = min(tmax, max(tx1, tx2))
        if abs(dy) < 1e-9:
            if not (self.y <= y0 <= self.y + self.h): return None
        else:
            ty1 = (self.y - y0) / dy; ty2 = (self.y + self.h - y0) / dy
            tmin = max(tmin, min(ty1, ty2)); tmax = min(tmax, max(ty1, ty2))
        if tmax < tmin or tmax < 0: return None
        t_hit = tmin if tmin >= 0 else (tmax if tmax >= 0 else None)
        return t_hit if (t_hit is not None and t_hit >= 0) else None

@dataclass
class World:
    width: float; height: float; obstacles: List[Rectangle]
    def raycast(self, x, y, theta, max_range):
        dx, dy = math.cos(theta), math.sin(theta); t_best = max_range
        borders = [Rectangle(0,-1e-6,self.width,1e-6),
                   Rectangle(0,self.height,self.width,1e-6),
                   Rectangle(-1e-6,0,1e-6,self.height),
                   Rectangle(self.width,0,1e-6,self.height)]
        for rect in self.obstacles + borders:
            t = rect.ray_intersect(x,y,dx,dy)
            if t is not None and 0.0 <= t < t_best: t_best = t
        return min(t_best, max_range)

@dataclass
class Robot:
    x: float; y: float; yaw: float
    v: float=0.0; w: float=0.0; wheelbase: float=0.32; wheel_r: float=0.10
    v_max: float=1.5; w_max: float=1.5
    def step(self, dt):
        self.x += self.v*math.cos(self.yaw)*dt; self.y += self.v*math.sin(self.yaw)*dt
        self.yaw = (self.yaw + self.w*dt + math.pi)%(2*math.pi)-math.pi

@dataclass
class LidarSim:
    world: World; robot: Robot; max_range: float=6.0; resolution_deg: float=1.0
    noise_sigma: float=0.01; dropout_prob: float=0.02
    def scan(self):
        data = []; n = int(360/self.resolution_deg)
        for i in range(n):
            ang_deg = i*self.resolution_deg
            theta = self.robot.yaw + math.radians(ang_deg)
            d = self.world.raycast(self.robot.x, self.robot.y, theta, self.max_range)
            d = 0.0 if random.random() < self.dropout_prob else max(0.0, d + random.gauss(0.0, self.noise_sigma))
            data.append((ang_deg%360.0, d))
        return data

def sector_minima(scan):
    import numpy as np
    angles = np.array([a for a,_ in scan], dtype=np.float32)
    dists  = np.array([d for _,d in scan], dtype=np.float32)
    rel = (angles - 0.0 + 360.0) % 360.0
    def min_in_range(lo, hi):
        mask = (rel >= lo) & (rel <= hi) if lo<=hi else ((rel >= lo) | (rel <= hi))
        vals = dists[mask]; vals = vals[(vals > 0.05)]
        return float(np.min(vals)) if vals.size else 999.0
    d_center = min_in_range(330,30); d_left=min_in_range(30,150)
    d_right = min_in_range(210,330); d_fwd=min_in_range(350,10)
    return d_left, d_center, d_right, d_fwd

class PolicyNN:
    def __init__(self, v_max=1.2, w_max=1.2): self.v_max=v_max; self.w_max=w_max
    def step(self, features):
        dL,dC,dR,dF,heading_err,xtrack,v_curr = map(float, features)
        v = min(self.v_max, max(0.0, 0.6*(dC-0.4)))
        w = 0.8*heading_err + 0.2*(0.5*(dR-dL))
        w = max(-self.w_max, min(self.w_max, w))
        if dF < 0.4: v,w = 0.0,0.0
        return float(v), float(w)

def waypoint_errors(state_xypsi, waypoint):
    x,y,psi = state_xypsi; wx,wy = waypoint
    vec_w = math.atan2(wy - y, wx - x)
    heading_err = (vec_w - psi + math.pi)%(2*math.pi)-math.pi
    dx,dy = wx-x, wy-y
    cross_track = (-math.sin(psi))*dx + (math.cos(psi))*dy
    return heading_err, cross_track

def main():
    random.seed(0); np.random.seed(0)
    world = World(12.0,8.0,[Rectangle(3.5,2.0,1.0,2.5), Rectangle(7.0,4.5,1.5,1.0), Rectangle(1.0,6.0,2.0,0.6)])
    rob = Robot(1.0,1.0,0.0,0.0,0.0,0.36,0.10,1.5,1.5)
    lidar = LidarSim(world, rob, 6.0, 1.0, 0.01, 0.02)
    policy = PolicyNN(1.2, 1.2)
    waypoints = [(10.0,1.0),(10.0,7.0),(2.0,7.0),(2.0,2.0)]; wp_idx=0
    dt=0.1; steps=350; path=[(rob.x,rob.y)]
    last_scan=None
    for _ in range(steps):
        scan = lidar.scan(); last_scan=scan
        dL,dC,dR,dF = sector_minima(scan)
        wpt = waypoints[wp_idx]
        heading_err, xtrack = waypoint_errors((rob.x,rob.y,rob.yaw), wpt)
        feats = np.array([dL,dC,dR,dF,heading_err,xtrack,rob.v], dtype=np.float32)
        v_cmd,w_cmd = policy.step(feats)
        v_cmd = max(0.0, min(rob.v_max, v_cmd)); w_cmd = max(-rob.w_max, min(rob.w_max, w_cmd))
        rob.v, rob.w = v_cmd, w_cmd; rob.step(dt); path.append((rob.x,rob.y))
        if math.hypot(wpt[0]-rob.x, wpt[1]-rob.y) < 0.5: wp_idx=(wp_idx+1)%len(waypoints)
    fig,ax = plt.subplots(figsize=(8,5))
    for r in world.obstacles: ax.add_patch(plt.Rectangle((r.x,r.y),r.w,r.h,fill=True,alpha=0.3))
    p = np.array(path); ax.plot(p[:,0],p[:,1],linewidth=2); ax.plot([rob.x],[rob.y],marker='o')
    if last_scan is not None:
        for ang_deg,dist in last_scan[::12]:
            if 0.05 < dist < lidar.max_range:
                theta = rob.yaw + math.radians(ang_deg)
                x2 = rob.x + dist*math.cos(theta); y2 = rob.y + dist*math.sin(theta)
                ax.plot([rob.x,x2],[rob.y,y2],linewidth=0.5)
    wparr = np.array(waypoints); ax.plot(wparr[:,0],wparr[:,1],marker='x',linestyle='')
    ax.set_aspect('equal','box'); ax.set_xlim(0,world.width); ax.set_ylim(0,world.height)
    ax.set_title("RC Robot: Path with Simulated LiDAR Rays"); plt.tight_layout(); plt.show()

if __name__ == "__main__":
    main()
