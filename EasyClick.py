import time
from pynput.mouse import Button, Controller

time.sleep(3)
mouse = Controller()

t = time.time()
mouse.click(Button.left, 1000)
print(time.time()-t)
