import time
from pynput.mouse import Button, Controller
time.sleep(3)
mouse = Controller()
mouse.click(Button.left, 20)
