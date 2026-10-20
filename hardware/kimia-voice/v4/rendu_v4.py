"""Rendus techniques de la V4 à partir des STL (VTK, logiciel local)."""
import vtk
from pathlib import Path
D=Path(__file__).resolve().parent
parts=[
('01_socle_HP_vers_le_bas.stl',(0.16,.19,.23),1.0),
('02_chambre_acoustique.stl',(.18,.21,.26),1.0),
('03_cloison_etanche.stl',(.29,.31,.34),1.0),
('04_corps_facade_plate_ecran_encastre.stl',(.24,.28,.33),1.0),
('05_couronne_superieure_XVF.stl',(.13,.16,.20),1.0),
('08_gabarit_plexiglas_NE_PAS_IMPRIMER.stl',(.045,.08,.14),.56),
('07_bague_facade_optionnelle.stl',(.085,.095,.12),1.0),
]

def scene(position,filename,scale):
 r=vtk.vtkRenderer();r.SetBackground(.92,.95,.97);r.SetBackground2(1.,1.,1.);r.GradientBackgroundOn();r.AutomaticLightCreationOn()
 for idx,(fn,col,alpha) in enumerate(parts):
  read=vtk.vtkSTLReader();read.SetFileName(str(D/fn));read.Update()
  mapper=vtk.vtkPolyDataMapper();mapper.SetInputConnection(read.GetOutputPort())
  actor=vtk.vtkActor();actor.SetMapper(mapper);prop=actor.GetProperty();prop.SetColor(*col);prop.SetOpacity(alpha);prop.SetSpecular(.30);prop.SetSpecularPower(30)
  if idx==5:actor.AddPosition(0,0,122.45)
  if idx==6:actor.RotateX(-90);actor.AddPosition(0,-78.04,81)
  r.AddActor(actor)
 # Screen illustrated as flat glass within the body, not as protruding extra pod.
 display=vtk.vtkCylinderSource();display.SetRadius(23.3);display.SetHeight(.35);display.SetResolution(100)
 display.SetCenter(0,-77.9,81)
 m=vtk.vtkPolyDataMapper();m.SetInputConnection(display.GetOutputPort())
 a=vtk.vtkActor();a.SetMapper(m);a.GetProperty().SetColor(.018,.028,.043);a.GetProperty().SetSpecular(.65);r.AddActor(a)
 # screen luminous ring
 cir=vtk.vtkRegularPolygonSource();cir.SetNumberOfSides(96);cir.SetRadius(16.8);cir.SetGeneratePolygon(False);cir.SetCenter(0,0,0)
 cmap=vtk.vtkPolyDataMapper();cmap.SetInputConnection(cir.GetOutputPort())
 ring=vtk.vtkActor();ring.SetMapper(cmap);ring.RotateX(90);ring.AddPosition(0,-78.3,81);ring.GetProperty().SetColor(.13,.52,.97);ring.GetProperty().SetLineWidth(2.0);r.AddActor(ring)
 led=vtk.vtkRegularPolygonSource();led.SetNumberOfSides(96);led.SetRadius(11);led.SetGeneratePolygon(False)
 mm=vtk.vtkPolyDataMapper();mm.SetInputConnection(led.GetOutputPort())
 aa=vtk.vtkActor();aa.SetMapper(mm);aa.AddPosition(0,0,124.4);aa.GetProperty().SetColor(.14,.53,.98);aa.GetProperty().SetLineWidth(3.0);r.AddActor(aa)
 ren=vtk.vtkRenderWindow();ren.SetOffScreenRendering(1);ren.SetSize(1500,1200);ren.AddRenderer(r)
 cam=r.GetActiveCamera();cam.SetPosition(*position);cam.SetFocalPoint(0,0,63);cam.SetViewUp(0,0,1)
 cam.SetParallelProjection(True);cam.SetParallelScale(scale)
 r.ResetCameraClippingRange();ren.Render()
 image=vtk.vtkWindowToImageFilter();image.SetInput(ren);image.Update()
 writer=vtk.vtkPNGWriter();writer.SetFileName(str(D/filename));writer.SetInputConnection(image.GetOutputPort());writer.Write()
 print(filename,flush=True)
scene((250,-330,225),'APERCU_V4_3D.png',128)
scene((0,-450,130),'APERCU_V4_FACE.png',115)
scene((30,-90,500),'APERCU_V4_DESSUS.png',112)