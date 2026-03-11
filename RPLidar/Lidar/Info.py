import inspect
print("lidar type:", type(lidar))
print("lidar module:", type(lidar).__module__)
print("lidar file:", inspect.getfile(type(lidar)))
print("has iter_measures:", hasattr(lidar, "iter_measures"))
print("has iter_scans:", hasattr(lidar, "iter_scans"))
print([m for m in dir(lidar) if "iter" in m.lower()])